import type { Input } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { importSourcePage } from "@design-studio/actions/page/import-source";
import { PAGE_IMPORT_WIDTH_DEFAULT } from "@design-studio/contracts/page-import";
import { Effect } from "effect";

import {
  RouteSourceStore,
  RouteSourceWriter,
  toAppRouteUrl,
  toReadyAppUpstream,
} from "../../project-ops/index.js";
import { PageWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ImportSourcePageInput = Input<typeof importSourcePage>;

const toCopyName = (file: string): string => {
  const base = file.replace(/^\/+/u, "").replace(/\.html?$/u, "");

  return `${base}-app`;
};

const toWidth = (viewport: number | null): number => {
  if (viewport === null) {
    return PAGE_IMPORT_WIDTH_DEFAULT;
  }

  return viewport;
};

const handle = Effect.fn("page.importSource")(function* run(
  input: ImportSourcePageInput
) {
  const store = yield* RouteSourceStore;

  const target = {
    directionId: input.directionId,
    file: input.file,
    projectId: input.projectId,
  };

  const entry = yield* store.get(target);

  if (entry === null) {
    return yield* new BadRequest({
      message: `The page ${input.file} is not a copy of an app route. Only a route prototype page can be copied again.`,
    });
  }

  const upstream = yield* toReadyAppUpstream(entry.appProjectId);
  const pages = yield* PageWriter;

  const imported = yield* pages.import({
    directionId: input.directionId,
    name: toCopyName(input.file),
    projectId: input.projectId,
    selector: null,
    url: toAppRouteUrl(upstream, entry.routePath),
    width: toWidth(entry.viewport),
  });

  const writer = yield* RouteSourceWriter;

  yield* writer.record({
    appProjectId: entry.appProjectId,
    directionId: input.directionId,
    frameId: imported.frameId,
    page: imported.page,
    projectId: input.projectId,
    routePath: entry.routePath,
    viewport: entry.viewport,
  });

  return {
    frameId: imported.frameId,
    page: imported.page,
    routePath: entry.routePath,
    sourcePage: entry.page,
    versionId: imported.versionId,
  };
}) satisfies Handle<typeof importSourcePage>;

export { handle };
