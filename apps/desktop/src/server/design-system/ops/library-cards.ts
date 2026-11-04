import type { Input } from "@design-studio/actions/_core/action";
import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";
import type { applyPackPack } from "@design-studio/actions/pack/apply-pack";
import type { PackFile } from "@design-studio/actions/pack/schema";
import type { PackProblem, PackSummary } from "@design-studio/contracts";

import { NotFoundError } from "../../platform/errors/index.js";
import { packProblems } from "../packs.js";
import type { PackRuntime } from "./library-core.js";
import { toSourceLines } from "./library-draft-input.js";
import type { DraftInput } from "./library-draft-input.js";

type ApplyInput = Input<typeof applyPackPack>;

const TEXT_MAX = 160;

const ZIP_TYPE = "application/zip";

const toLine = (text: string): string =>
  text.replaceAll(/\s+/gu, " ").trim().slice(0, TEXT_MAX);

const listSummaries = (runtime: PackRuntime): Promise<PackSummary[]> =>
  runtime.library.registry.list();

const listProblems = async (runtime: PackRuntime): Promise<PackProblem[]> =>
  packProblems(await runtime.library.registry.problems());

const exportZip = async (
  runtime: PackRuntime,
  packId: string
): Promise<PackFile> => {
  const { bytes, fileName } = await runtime.library.exportPack(packId);

  return {
    content: Buffer.from(bytes).toString("base64"),
    name: fileName,
    type: ZIP_TYPE,
  };
};

const requirePack = async (
  runtime: PackRuntime,
  packId: string
): Promise<PackSummary> => {
  const pack = await runtime.library.registry.get(packId);

  if (!pack) {
    throw new NotFoundError(`unknown pack: ${packId}`);
  }

  return pack.summary;
};

const toDeleteCard = async (
  runtime: PackRuntime,
  packId: string
): Promise<ApprovalCard> => {
  const pack = await requirePack(runtime, packId);

  return {
    action: "Delete a design system",
    detail: `${toLine(pack.name)} leaves the studio library. Projects that use it keep their files.`,
    title: `Delete design system ${toLine(pack.name)}`,
  };
};

const toApplyCard = async (
  runtime: PackRuntime,
  input: ApplyInput
): Promise<ApprovalCard> => {
  const [pack, project] = await Promise.all([
    requirePack(runtime, input.packId),
    runtime.projects.get(input.projectId),
  ]);

  return {
    action: "Apply a design system",
    detail: `${toLine(project.name)}. Writes over the tokens, tokens.css and DESIGN.md of the direction as one new version. Project notes stay.`,
    title: `Apply ${toLine(pack.name)} to ${toLine(project.name)}`,
  };
};

const toDraftCard = (input: DraftInput): ApprovalCard => {
  const sources = toSourceLines(input);
  const name = toLine(input.name ?? "a new design system");

  return {
    action: "Create a design system draft",
    detail: `The studio reads ${sources.join("; ") || "the sources"} and copies the tokens it finds into a new draft project, where outside agents can read them.`,
    title: `Create ${name} from ${toLine(sources.join(", ") || "sources")}`,
  };
};

export {
  exportZip,
  listProblems,
  listSummaries,
  toApplyCard,
  toDeleteCard,
  toDraftCard,
};
