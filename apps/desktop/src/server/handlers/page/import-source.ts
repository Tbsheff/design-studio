import type { Input } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { importSourcePage } from "@design-studio/actions/page/import-source";
import { PAGE_IMPORT_WIDTH_DEFAULT } from "@design-studio/contracts/page-import";
import { Effect } from "effect";

import { FixtureStore } from "../../export/index.js";
import {
  RouteSourceStore,
  RouteSourceWriter,
  toAppRouteUrl,
  toReadyAppUpstream,
} from "../../project-ops/index.js";
import { PageWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ImportSourcePageInput = Input<typeof importSourcePage>;

interface SourceImport {
  readonly appProjectId: string;
  readonly directionId: string;
  readonly name: string;
  readonly projectId: string;
  readonly routePath: string;
  readonly upstream: string;
  readonly width: number;
}

const DATA_FAILURE = /answered [45]\d\d\.$|had nothing to copy/u;

const FIXTURE_LIST_LIMIT = 200;

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

const toConflict = (error: BadRequest): Effect.Effect<never, Conflict> =>
  Effect.fail(new Conflict({ message: error.message }));

const toSlashPath = (route: string): string =>
  `/${route.trim().split("/").filter(Boolean).join("/")}`;

const toFixtureRoute = Effect.fn("page.importSource.toFixtureRoute")(
  function* run(appProjectId: string, routePath: string) {
    const store = yield* FixtureStore;

    const { items } = yield* store.list({
      cursor: null,
      limit: FIXTURE_LIST_LIMIT,
      projectId: appProjectId,
    });

    const wanted = toSlashPath(routePath);

    const fixture =
      items.findLast((item) => toSlashPath(item.sourceRoute) === wanted) ??
      null;

    return fixture?.route ?? null;
  }
);

const importRoutePage = Effect.fn("page.importSource.importRoutePage")(
  function* run(source: SourceImport, route: string) {
    const pages = yield* PageWriter;

    return yield* pages.import({
      appRoute: source.routePath,
      directionId: source.directionId,
      name: source.name,
      projectId: source.projectId,
      selector: null,
      url: toAppRouteUrl(source.upstream, route),
      width: source.width,
    });
  }
);

const importSourceOrFixture = Effect.fn(
  "page.importSource.importSourceOrFixture"
)(function* run(source: SourceImport) {
  return yield* importRoutePage(source, source.routePath).pipe(
    Effect.catchTag("BadRequest", (error) =>
      Effect.gen(function* fromFixture() {
        if (!DATA_FAILURE.test(error.message)) {
          return yield* error;
        }

        const route = yield* toFixtureRoute(
          source.appProjectId,
          source.routePath
        );

        if (route === null) {
          return yield* error;
        }

        return yield* importRoutePage(source, route);
      })
    )
  );
});

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

  const ready = yield* toReadyAppUpstream(entry.appProjectId).pipe(
    Effect.catchTag("BadRequest", toConflict)
  );

  const imported = yield* importSourceOrFixture({
    appProjectId: entry.appProjectId,
    directionId: input.directionId,
    name: toCopyName(input.file),
    projectId: input.projectId,
    routePath: entry.routePath,
    upstream: ready,
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
