import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ProposalStatus } from "@design-studio/actions/design-rule/proposal/schema";
import { Schema } from "effect";

const STATUS_FILE = "rule-proposals.json";

const STATUS_ID_MAX = 500;

const ProposalStatusFileSchema = Schema.Struct({
  accepted: Schema.Array(Schema.String),
  dismissed: Schema.Array(Schema.String),
});

type ProposalStatusFile = typeof ProposalStatusFileSchema.Type;

const EMPTY_STATUS: ProposalStatusFile = { accepted: [], dismissed: [] };

const toDecodedStatus = Schema.decodeUnknownPromise(
  Schema.fromJsonString(ProposalStatusFileSchema)
);

const toStatusPath = (projectDir: string): string =>
  path.join(projectDir, STATUS_FILE);

const isMissing = (cause: unknown): boolean =>
  cause instanceof Error && "code" in cause && cause.code === "ENOENT";

const getProposalStatus = async (
  projectDir: string
): Promise<ProposalStatusFile> => {
  try {
    return await toDecodedStatus(
      await readFile(toStatusPath(projectDir), "utf-8")
    );
  } catch (error) {
    if (isMissing(error)) {
      return EMPTY_STATUS;
    }

    throw error;
  }
};

const toClosedIds = (status: ProposalStatusFile): ReadonlySet<string> =>
  new Set([...status.accepted, ...status.dismissed]);

const setProposalStatus = async (
  projectDir: string,
  id: string,
  status: ProposalStatus
): Promise<ProposalStatusFile> => {
  const known = await getProposalStatus(projectDir);
  const accepted = known.accepted.filter((item) => item !== id);
  const dismissed = known.dismissed.filter((item) => item !== id);

  if (status === "accepted") {
    accepted.push(id);
  } else {
    dismissed.push(id);
  }

  const next: ProposalStatusFile = {
    accepted: accepted.slice(-STATUS_ID_MAX),
    dismissed: dismissed.slice(-STATUS_ID_MAX),
  };

  const file = toStatusPath(projectDir);
  const draft = `${file}.${process.pid}.tmp`;

  await mkdir(projectDir, { recursive: true });
  await writeFile(draft, `${JSON.stringify(next, null, 2)}\n`);
  await rename(draft, file);

  return next;
};

export { getProposalStatus, toClosedIds, setProposalStatus };

export type { ProposalStatusFile };
