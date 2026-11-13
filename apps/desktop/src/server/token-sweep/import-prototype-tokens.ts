import { readFile } from "node:fs/promises";
import path from "node:path";

import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect } from "effect";

import type { TokenDiff } from "../design-system/index.js";
import {
  assertCanEdit,
  attemptKnown,
  isAppPrototype,
  PROTOTYPE_TOKENS_FILE,
  publishVersion,
  runDirectionRead,
  runDirectionWrite,
  savesSettled,
  toPrototypeTokenCss,
  toTokenDiff,
  writeAndCommitAll,
} from "./deps.js";
import type {
  DirectionRun,
  Project,
  Refine,
  Version,
  WrittenFile,
} from "./deps.js";

interface TokenImportResult extends TokenDiff {
  readonly file: string;
  readonly sourceFile: string;
  readonly tokens: number;
  readonly versionId: string | null;
}

interface PrototypeTokenIds {
  readonly directionId: string;
  readonly projectId: string;
}

const MAIN_DIRECTION_ID = "main";
const IMPORT_TITLE = "Refresh app tokens";
const NOT_PROTOTYPE = "This project is not a prototype of an app.";

const toNoRefine: Refine<never> = () => null;

const toRun = (run: DirectionRun): Promise<DirectionRun> =>
  Promise.resolve(run);

const toAppFolder = (app: Project, workTree: string): string =>
  app.folder?.path ?? app.imported?.sourcePath ?? workTree;

const toPrompt = (diff: TokenDiff, source: string): string =>
  `${IMPORT_TITLE} from ${source}: ${diff.changed} changed, ${diff.added} added, ${diff.removed} removed`;

const toWritten = (
  run: DirectionRun,
  before: string | null,
  code: string
): WrittenFile => ({
  code,
  created: before === null,
  original: before ?? "",
  target: {
    file: path.join(run.direction.workTree, PROTOTYPE_TOKENS_FILE),
    relative: PROTOTYPE_TOKENS_FILE,
  },
});

const setTokensFile = (
  run: DirectionRun,
  written: WrittenFile,
  prompt: string
): Promise<Version> => {
  assertCanEdit(run.runtime.editDeps, run.project, run.direction);

  return writeAndCommitAll(
    run.runtime.editDeps,
    run.project,
    run.direction,
    [written],
    IMPORT_TITLE,
    { kind: "manual", prompt }
  );
};

const publishTokens = (
  run: DirectionRun,
  written: WrittenFile,
  version: Version
): Promise<void> => {
  run.runtime.editDeps.history?.record({
    directionId: run.direction.id,
    files: [
      {
        after: written.code,
        before: written.original,
        file: written.target.file,
        relative: written.target.relative,
      },
    ],
    label: IMPORT_TITLE,
    projectId: run.project.id,
    versionId: version.id,
  });

  return publishVersion(
    run.runtime.editDeps,
    run.project,
    run.direction,
    version
  );
};

const getAppRun = Effect.fn("getAppRun")(function* run(target: DirectionRun) {
  if (!isAppPrototype(target.project)) {
    return yield* new BadRequest({ message: NOT_PROTOTYPE });
  }

  return yield* runDirectionRead(
    {
      directionId: MAIN_DIRECTION_ID,
      projectId: target.project.appProjectId ?? "",
    },
    toRun,
    toNoRefine
  );
});

const importPrototypeTokens = Effect.fn("importPrototypeTokens")(function* run(
  ids: PrototypeTokenIds
) {
  const target = yield* runDirectionRead(ids, toRun, toNoRefine);
  const app = yield* getAppRun(target);

  const built = yield* attemptKnown(() =>
    toPrototypeTokenCss(
      toAppFolder(app.project, app.direction.workTree),
      app.project.name
    )
  );

  if (built.css === null || built.file === null) {
    return yield* new NotFound({
      message: `${app.project.name} has no CSS token file.`,
    });
  }

  const before = yield* attemptKnown(() =>
    readFile(
      path.join(target.direction.workTree, PROTOTYPE_TOKENS_FILE),
      "utf-8"
    )
  ).pipe(Effect.orElseSucceed(() => null));

  const diff = toTokenDiff(before, built.css);

  const base = {
    ...diff,
    file: PROTOTYPE_TOKENS_FILE,
    sourceFile: built.file,
    tokens: built.tokens,
  };

  if (before === built.css) {
    return { ...base, versionId: null };
  }

  const written = toWritten(target, before, built.css);
  const prompt = toPrompt(diff, built.file);

  const version = yield* runDirectionWrite(
    ids,
    (locked) => setTokensFile(locked, written, prompt),
    toNoRefine
  );

  yield* runDirectionRead(
    ids,
    (locked) => publishTokens(locked, written, version),
    toNoRefine
  );

  yield* attemptKnown(() => savesSettled(ids.projectId));

  const result: TokenImportResult = { ...base, versionId: version.id };

  return result;
});

export { importPrototypeTokens };

export type { PrototypeTokenIds, TokenImportResult };
