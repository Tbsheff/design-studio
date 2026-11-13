import path from "node:path";

import { PAGE_SOURCE_CHANGES_MAX } from "@design-studio/actions/page/source/schema";
import type {
  PageSourceChanges,
  PageSourceFileDiff,
} from "@design-studio/actions/page/source/schema";
import { Effect } from "effect";

import { readTextFile } from "../../platform/local-file/index.js";
import { toChangedFiles } from "./engine/to-changed-files.js";
import { toFileDiffs } from "./engine/to-file-diffs.js";
import {
  getSnapshotText,
  toRouteFiles,
  toShaMap,
} from "./route-source-file.js";
import type { RouteSourceEntry } from "./route-source-file.js";
import { toAppWorkTree, toCopyOf } from "./route-source-target.js";
import type { SourcePageCommand } from "./route-source-target.js";

const NO_CHANGES: PageSourceChanges = {
  appProjectId: null,
  copiedAt: null,
  files: [],
  hasSnapshot: false,
  isRouteCopy: false,
  routePath: null,
};

interface ChangeCommand {
  readonly appWorkTree: string;
  readonly entry: RouteSourceEntry;
  readonly routeFiles: readonly string[];
  readonly workTree: string;
}

const toAddedFiles = (command: ChangeCommand): string[] => {
  const saved = new Set(command.entry.files.map((item) => item.file));

  return command.routeFiles.filter((file) => !saved.has(file));
};

const toHashDiffs = Effect.fn("RouteSource.toHashDiffs")(function* run(
  command: ChangeCommand
) {
  const { entry } = command;

  const now = yield* toShaMap(
    command.appWorkTree,
    entry.files.map((item) => item.file)
  );

  const changed = toChangedFiles(entry.files, now).map(
    (item): PageSourceFileDiff => ({
      change: item.change,
      diff: "",
      file: item.file,
      isCut: false,
    })
  );

  const added = toAddedFiles(command).map((addedFile): PageSourceFileDiff => ({
    change: "added",
    diff: "",
    file: addedFile,
    isCut: false,
  }));

  return [...changed, ...added].slice(0, PAGE_SOURCE_CHANGES_MAX);
});

const toTextDiffs = Effect.fn("RouteSource.toTextDiffs")(function* run(
  command: ChangeCommand
) {
  const { entry } = command;
  const saved = entry.files.map((item) => item.file);
  const files = [...saved, ...toAddedFiles(command)];

  const befores = yield* Effect.all(
    saved.map((file) => getSnapshotText(command.workTree, entry.page, file))
  );

  const afters = yield* Effect.all(
    files.map((file) => readTextFile(path.join(command.appWorkTree, file)))
  );

  return toFileDiffs(
    files.map((file, index) => ({
      after: afters[index] ?? null,
      before: befores[index] ?? null,
      file,
    }))
  );
});

const toSourceFileDiffs = (
  command: ChangeCommand
): Effect.Effect<PageSourceFileDiff[]> => {
  if (command.entry.hasSnapshot) {
    return toTextDiffs(command);
  }

  return toHashDiffs(command);
};

const toPageSourceChanges = Effect.fn("RouteSource.toPageSourceChanges")(
  function* run(command: SourcePageCommand) {
    const copy = yield* toCopyOf(command);

    if (copy === null) {
      return NO_CHANGES;
    }

    const { entry, workTree } = copy;
    const app = yield* toAppWorkTree(entry.appProjectId);

    const routeFiles = yield* toRouteFiles(
      app.workTree,
      app.appDir,
      entry.routePath
    );

    const diffs = yield* toSourceFileDiffs({
      appWorkTree: app.workTree,
      entry,
      routeFiles,
      workTree,
    });

    const changes: PageSourceChanges = {
      appProjectId: entry.appProjectId,
      copiedAt: entry.copiedAt,
      files: diffs,
      hasSnapshot: entry.hasSnapshot,
      isRouteCopy: true,
      routePath: entry.routePath,
    };

    return changes;
  }
);

export { toPageSourceChanges };
