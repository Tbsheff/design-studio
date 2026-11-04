import { existsSync } from "node:fs";
import path from "node:path";

import { Schema } from "effect";

import {
  toOptional,
  toSdkFieldSet,
  toToolInput,
} from "../agent-tools/index.js";
import { diffVersionFiles } from "../store/version-diff.js";
import { runGit } from "../store/versions.js";
import { versionThumbName } from "../thumbnails.js";

const DIFF_VERSIONS_TEXT =
  "Compare two saved versions, the same as Compare in the studio Versions panel. Returns each changed file (path, oldPath for a rename, status added, removed, modified or renamed, additions, deletions, binary) with its unified git diff (cut at 64 KB a file, 512 KB in all, and 100 files; truncated says so). With thumbnails (default) it also returns thumbs: absolute PNG paths of a 1280x800 screenshot of each version, a mask PNG of the changed pixels and changedPct. Read only.";

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const sha = Schema.String.check(Schema.isPattern(/^[0-9a-f]{40}$/u));

const diffVersionsFields = {
  from: sha.annotate({ description: "The older version id." }),
  to: toOptional(
    sha,
    "The newer version id. Leave out for the head version of this direction."
  ),
};

export const diffVersionsShape = toSdkFieldSet(diffVersionsFields);

const diffVersionsInput = toToolInput(diffVersionsFields);

export const DIFF_VERSIONS_DESCRIPTION = `${DIFF_VERSIONS_TEXT.replace(/ With thumbnails[^.]*\./, "").replace(/ Read only\.$/, "")} thumbs gives the paths of version screenshots the studio already saved (null when there is none yet). Read only.`;

interface DiffDeps {
  runsDir: string;
  headVersionId: string | null;
}

function text(message: string, isError = false): ToolText {
  return {
    content: [{ text: message, type: "text" }],
    ...(isError ? { isError: true } : {}),
  };
}

export async function runDiffVersions(
  deps: DiffDeps,
  args: { from: string; to?: string | undefined }
): Promise<ToolText> {
  const parsed = diffVersionsInput.safeParse(args);

  if (!parsed.success) {
    return text(`diff_versions: ${parsed.error}`, true);
  }

  const to = parsed.data.to ?? deps.headVersionId;

  if (!to) {
    return text(
      "diff_versions: this direction has no saved version yet.",
      true
    );
  }

  const projectDir = path.dirname(deps.runsDir);

  const thumb = (id: string): string | null => {
    const file = path.join(projectDir, "thumbs", versionThumbName(id));

    return existsSync(file) ? file : null;
  };

  try {
    const changes = await diffVersionFiles(
      async (gitArgs) =>
        (await runGit({ gitDir: path.join(projectDir, "git") }, gitArgs))
          .stdout,
      parsed.data.from,
      to
    );

    return text(
      JSON.stringify(
        {
          ...changes,
          thumbs: { from: thumb(parsed.data.from), to: thumb(to) },
        },
        null,
        2
      )
    );
  } catch (error) {
    return text(
      `diff_versions failed: ${error instanceof Error ? error.message : String(error)}`,
      true
    );
  }
}
