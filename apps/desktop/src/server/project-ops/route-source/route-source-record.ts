import { Effect } from "effect";

import { setPrivateJson } from "../../platform/atomic-write/index.js";
import {
  getRecord,
  toPagePath,
  toRecordPath,
  toRouteFiles,
} from "./route-source-file.js";
import type { RouteSourceEntry } from "./route-source-file.js";
import { setSnapshot, toFileTexts } from "./route-source-snapshot.js";
import { toAppWorkTree } from "./route-source-target.js";

interface EntryCommand {
  readonly appProjectId: string;
  readonly fixtureRoute: string | null;
  readonly frameId: string;
  readonly page: string;
  readonly routePath: string;
  readonly viewport: number | null;
}

const setRecordEntry = Effect.fn("RouteSource.setRecordEntry")(function* run(
  workTree: string,
  entry: RouteSourceEntry
) {
  const record = yield* getRecord(workTree);
  const others = record.entries.filter((saved) => saved.page !== entry.page);

  yield* setPrivateJson(toRecordPath(workTree), {
    entries: [...others, entry],
  });
});

const setCopyEntry = Effect.fn("RouteSource.setCopyEntry")(function* run(
  workTree: string,
  command: EntryCommand
) {
  const app = yield* toAppWorkTree(command.appProjectId);

  const files = yield* toRouteFiles(
    app.workTree,
    app.appDir,
    command.routePath
  );

  const texts = yield* toFileTexts(app.workTree, files);

  const entry: RouteSourceEntry = {
    appProjectId: command.appProjectId,
    copiedAt: Date.now(),
    files: texts.map((item) => ({ file: item.file, sha: item.sha })),
    fixtureRoute: command.fixtureRoute,
    frameId: command.frameId,
    hasSnapshot: yield* setSnapshot(workTree, command.page, texts),
    page: toPagePath(command.page),
    routePath: command.routePath,
    viewport: command.viewport,
  };

  yield* setRecordEntry(workTree, entry);

  return entry;
});

export { setCopyEntry };

export type { EntryCommand };
