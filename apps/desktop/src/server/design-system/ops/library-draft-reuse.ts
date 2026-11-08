import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  DesignSystemDraftResult,
  Project,
} from "@design-studio/contracts";
import { Option, Schema } from "effect";

import { COVERAGE_FILE, META_FILE } from "../extract/draft.js";
import type { LoadedPack } from "../packs.js";
import type { PackWriteRuntime } from "./library-core.js";

const DraftMetaSchema = Schema.Struct({
  inputs: Schema.Struct({ folderPath: Schema.NullOr(Schema.String) }),
  packId: Schema.String,
});

const CoverageMarkSchema = Schema.Struct({ grade: Schema.String });

const decodeMeta = Schema.decodeUnknownOption(
  Schema.fromJsonString(DraftMetaSchema)
);

const decodeCoverageMark = Schema.decodeUnknownOption(
  Schema.fromJsonString(CoverageMarkSchema)
);

const toTextOrNull = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

interface Match {
  readonly coverage: DesignSystemDraftResult["coverage"];
  readonly pack: LoadedPack;
  readonly project: Project;
}

const toMatch = async (
  runtime: PackWriteRuntime,
  project: Project,
  folderPath: string
): Promise<Match | null> => {
  if (!project.designSystemFor || project.designSystemDeleted) {
    return null;
  }

  const { workTree } = runtime.projects.mainDirection(project);
  const metaText = await toTextOrNull(path.join(workTree, META_FILE));
  const meta = Option.flatMap(Option.fromNullishOr(metaText), decodeMeta);

  if (Option.isNone(meta) || meta.value.inputs.folderPath !== folderPath) {
    return null;
  }

  const coverageText = await toTextOrNull(path.join(workTree, COVERAGE_FILE));

  const mark = Option.flatMap(
    Option.fromNullishOr(coverageText),
    decodeCoverageMark
  );

  const pack = await runtime.library.registry.get(meta.value.packId);

  if (Option.isNone(mark) || !pack || coverageText === null) {
    return null;
  }

  const coverage: DesignSystemDraftResult["coverage"] =
    JSON.parse(coverageText);

  return { coverage, pack, project };
};

const toExistingDraft = async (
  runtime: PackWriteRuntime,
  folderPath: string,
  started: number
): Promise<DesignSystemDraftResult | null> => {
  const projects = await runtime.projects.list();

  const matches = await Promise.all(
    projects.map((project) => toMatch(runtime, project, folderPath))
  );

  const found = matches.find((match) => match !== null) ?? null;

  if (found === null) {
    return null;
  }

  return {
    coverage: found.coverage,
    ms: Date.now() - started,
    pack: found.pack.summary,
    project: found.project,
  };
};

export { toExistingDraft };
