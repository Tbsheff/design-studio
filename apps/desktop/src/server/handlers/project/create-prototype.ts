import type { Input } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { createPrototypeProject } from "@design-studio/actions/project/create-prototype";
import { PAGE_IMPORT_WIDTH_DEFAULT } from "@design-studio/contracts/page-import";
import { Effect } from "effect";

import { DevServerRunner, DevServerStore } from "../../app/index.js";
import { CanvasWriter } from "../../canvas/index.js";
import {
  isRouteMatch,
  ProjectOpsWriter,
  setPrototypeTokensLink,
} from "../../project-ops/index.js";
import { RunLogWriter } from "../../run-log/index.js";
import { PageWriter } from "../../share/index.js";
import { ProjectStore } from "../../store/index.js";
import { TokenSweepRunner } from "../../token-sweep/index.js";
import type { Handle } from "../_core/handler.js";

type CreatePrototypeProjectInput = Input<typeof createPrototypeProject>;

interface RouteRunBody {
  readonly canvas: {
    readonly frameId: string;
    readonly height: number;
    readonly path: string;
    readonly width: number;
  };
  readonly level?: NonNullable<CreatePrototypeProjectInput["level"]>;
  readonly mode: "edit";
  readonly prompt: string;
}

interface RouteCopy {
  readonly frameId: string;
  readonly height: number;
  readonly page: string;
  readonly width: number;
}

const READY_TRIES = 120;
const READY_PAUSE = "1 second";
const ENTRY_NAME = "index";
const ENTRY_FRAME = "f1";
const MAIN_DIRECTION = "main";

const toRoutePath = (routePath: string): string => {
  const trimmed = routePath.trim();

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return `/${trimmed}`;
};

const toImportWidth = (viewport: number | null): number => {
  if (viewport === null) {
    return PAGE_IMPORT_WIDTH_DEFAULT;
  }

  return viewport;
};

const toMainDirectionId = (
  directions: readonly { readonly id: string }[]
): string =>
  directions.find((direction) => direction.id === MAIN_DIRECTION)?.id ??
  directions[0]?.id ??
  MAIN_DIRECTION;

const toRouteUrl = (upstream: string, routePath: string): string =>
  new URL(routePath, new URL(upstream).origin).href;

const isKnownRoute = Effect.fn("project.createPrototype.isKnownRoute")(
  function* run(projectId: string, routePath: string) {
    const projects = yield* ProjectStore;
    const app = yield* projects.get(projectId);

    if (!app.app) {
      return yield* new BadRequest({
        message: `${app.name} is not an attached app. A route copy needs an app with a dev server.`,
      });
    }

    const servers = yield* DevServerStore;
    const { routes } = yield* servers.routes(projectId);

    return routes.some((route) => isRouteMatch(route.route, routePath));
  }
);

const toReadyUpstream = Effect.fn("project.createPrototype.toReadyUpstream")(
  function* run(projectId: string) {
    const servers = yield* DevServerStore;
    const runner = yield* DevServerRunner;
    const first = yield* servers.status(projectId);

    if (first?.state !== "ready") {
      yield* runner.control(projectId, "start");
    }

    for (let tries = 0; tries < READY_TRIES; tries += 1) {
      const status = yield* servers.status(projectId);

      if (status?.state === "ready" && status.upstream !== null) {
        return status.upstream;
      }

      if (status?.state === "failed") {
        return yield* new BadRequest({
          message: `The app dev server did not start: ${status.message ?? "no message"}. Fix it in the app panel, then try again.`,
        });
      }

      yield* Effect.sleep(READY_PAUSE);
    }

    return yield* new BadRequest({
      message:
        "The app dev server did not get ready in 2 minutes. Start it in the app panel, then try again.",
    });
  }
);

const importRouteCopy = Effect.fn("project.createPrototype.importRouteCopy")(
  function* run(
    target: { readonly directionId: string; readonly projectId: string },
    routeUrl: string,
    viewport: number | null
  ) {
    const pages = yield* PageWriter;
    const canvas = yield* CanvasWriter;

    const imported = yield* pages.import({
      directionId: target.directionId,
      name: ENTRY_NAME,
      projectId: target.projectId,
      selector: null,
      url: routeUrl,
      width: toImportWidth(viewport),
    });

    if (imported.frameId !== ENTRY_FRAME) {
      yield* canvas
        .deleteFrame({ frame: ENTRY_FRAME, projectId: target.projectId })
        .pipe(Effect.orElseSucceed(() => null));
    }

    const copy: RouteCopy = {
      frameId: imported.frameId,
      height: imported.height,
      page: imported.page,
      width: imported.width,
    };

    return copy;
  }
);

const applyRouteTokens = Effect.fn("project.createPrototype.applyRouteTokens")(
  function* run(
    target: { readonly directionId: string; readonly projectId: string },
    folder: string,
    pageFile: string
  ) {
    const hasTokens = yield* setPrototypeTokensLink(folder, pageFile);

    if (!hasTokens) {
      return;
    }

    const sweeper = yield* TokenSweepRunner;

    yield* sweeper.apply({
      directionId: target.directionId,
      dryRun: false,
      kinds: ["color", "spacing", "radius", "font"],
      layer: null,
      page: pageFile,
      projectId: target.projectId,
      select: null,
    });
  }
);

const toRouteRunBody = (
  input: CreatePrototypeProjectInput,
  routePath: string,
  copy: RouteCopy
): RouteRunBody => {
  const body: RouteRunBody = {
    canvas: {
      frameId: copy.frameId,
      height: copy.height,
      path: copy.page,
      width: copy.width,
    },
    mode: "edit",
    prompt: `Redesign ${routePath} (${copy.page} is a static copy of that app route, with the app tokens): ${input.prompt}`,
  };

  if (input.level === null) {
    return body;
  }

  return { ...body, level: input.level };
};

const createRoutePrototype = Effect.fn("project.createPrototype.route")(
  function* run(input: CreatePrototypeProjectInput, rawRoute: string) {
    const routePath = toRoutePath(rawRoute);
    const isKnown = yield* isKnownRoute(input.projectId, routePath);

    if (!isKnown) {
      return yield* new NotFound({
        message: `The app has no route ${routePath}. Read the routes with list_routes.`,
      });
    }

    const upstream = yield* toReadyUpstream(input.projectId);
    const writer = yield* ProjectOpsWriter;

    const created = yield* writer.createPrototype({
      ...input,
      shouldStartRun: false,
    });

    const target = {
      directionId: toMainDirectionId(created.project.directions),
      projectId: created.project.id,
    };

    const url = toRouteUrl(upstream, routePath);
    const copy = yield* importRouteCopy(target, url, input.viewport);
    yield* applyRouteTokens(target, created.folder, copy.page);

    if (!input.shouldStartRun) {
      return created;
    }

    const runs = yield* RunLogWriter;

    const { runId } = yield* runs.start({
      ...target,
      body: toRouteRunBody(input, routePath, copy),
    });

    return { ...created, runId };
  }
);

const handle = Effect.fn("project.createPrototype")(function* run(
  input: CreatePrototypeProjectInput
) {
  if (input.routePath !== null) {
    return yield* createRoutePrototype(input, input.routePath);
  }

  const writer = yield* ProjectOpsWriter;

  return yield* writer.createPrototype(input);
}) satisfies Handle<typeof createPrototypeProject>;

export { handle };
