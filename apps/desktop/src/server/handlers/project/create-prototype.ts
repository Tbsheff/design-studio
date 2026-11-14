import type { Input, Output } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { createPrototypeProject } from "@design-studio/actions/project/create-prototype";
import { PAGE_IMPORT_WIDTH_DEFAULT } from "@design-studio/contracts/page-import";
import { Effect } from "effect";

import { DevServerStore } from "../../app/index.js";
import { CanvasWriter } from "../../canvas/index.js";
import { FixtureStore } from "../../export/index.js";
import {
  isRouteMatch,
  ProjectOpsWriter,
  RouteSourceWriter,
  setPrototypeTokensLink,
  toAppRouteUrl,
  toReadyAppUpstream,
} from "../../project-ops/index.js";
import { RunLogWriter } from "../../run-log/index.js";
import { PageWriter } from "../../share/index.js";
import { ProjectStore } from "../../store/index.js";
import { TokenSweepRunner } from "../../token-sweep/index.js";
import type { Handle } from "../_core/handler.js";

type CreatePrototypeProjectInput = Input<typeof createPrototypeProject>;

type CreatePrototypeProjectOutput = Output<typeof createPrototypeProject>;

type FixtureOffer = NonNullable<CreatePrototypeProjectOutput["fixtureOffer"]>;

type RouteTarget = Omit<CreatePrototypeProjectOutput, "fixtureOffer">;

interface RouteLabel {
  readonly fixtureRoute: string | null;
  readonly sourceRoute: string;
}

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
  readonly elements: number;
  readonly frameId: string;
  readonly height: number;
  readonly page: string;
  readonly width: number;
}

interface CopyOutcome {
  readonly copy: RouteCopy | null;
  readonly failure: string;
}

const ENTRY_NAME = "index";
const EMPTY_ELEMENTS_MAX = 3;
const EMPTY_REASON = "The route copy has almost no content.";
const ESCAPED_UNDERSCORE = /%5F/giu;
const DATA_FAILURE = /answered [45]\d\d\.$|had nothing to copy/u;
const ENTRY_FRAME = "f1";
const MAIN_DIRECTION = "main";
const FIXTURE_LIST_LIMIT = 200;

const toRoutePath = (routePath: string): string => {
  const trimmed = routePath.trim();

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return `/${trimmed}`;
};

const toUrlRoute = (route: string): string =>
  route.replaceAll(ESCAPED_UNDERSCORE, "_");

const toRouteName = (name: string | null, routePath: string): string => {
  if (name !== null) {
    return name;
  }

  return `Redesign ${routePath}`;
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

    return routes.some((route) =>
      isRouteMatch(toUrlRoute(route.route), routePath)
    );
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
      appRoute: null,
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
      elements: imported.elements,
      frameId: imported.frameId,
      height: imported.height,
      page: imported.page,
      width: imported.width,
    };

    return copy;
  }
);

const toCopyOutcome = Effect.fn("project.createPrototype.toCopyOutcome")(
  function* run(
    target: { readonly directionId: string; readonly projectId: string },
    routeUrl: string,
    viewport: number | null
  ) {
    return yield* importRouteCopy(target, routeUrl, viewport).pipe(
      Effect.map((copy): CopyOutcome => ({ copy, failure: "" })),
      Effect.catchTag("BadRequest", (error) => {
        if (!DATA_FAILURE.test(error.message)) {
          return Effect.fail(error);
        }

        return Effect.succeed<CopyOutcome>({
          copy: null,
          failure: error.message,
        });
      })
    );
  }
);

const toFixtureOffer = (
  appProjectId: string,
  route: string,
  reason: string
): FixtureOffer => ({ appProjectId, reason, route });

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

const toRunPrompt = (label: RouteLabel, prompt: string): string => {
  if (label.fixtureRoute === null) {
    return `Redesign ${label.sourceRoute}: ${prompt}`;
  }

  return `Redesign ${label.sourceRoute} (with a data fixture): ${prompt}\n\nThe page data comes from the data fixture route ${label.fixtureRoute}.`;
};

const toRouteRunBody = (
  input: CreatePrototypeProjectInput,
  label: RouteLabel,
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
    prompt: toRunPrompt(label, input.prompt),
  };

  if (input.level === null) {
    return body;
  }

  return { ...body, level: input.level };
};

const toRouteLabel = Effect.fn("project.createPrototype.toRouteLabel")(
  function* run(appProjectId: string, routePath: string) {
    const store = yield* FixtureStore;

    const { items } = yield* store.list({
      cursor: null,
      limit: FIXTURE_LIST_LIMIT,
      projectId: appProjectId,
    });

    const fixture = items.find((item) => item.route === routePath) ?? null;

    if (fixture === null) {
      const label: RouteLabel = { fixtureRoute: null, sourceRoute: routePath };

      return label;
    }

    const label: RouteLabel = {
      fixtureRoute: routePath,
      sourceRoute: toRoutePath(fixture.sourceRoute),
    };

    return label;
  }
);

const toIntoTarget = Effect.fn("project.createPrototype.toIntoTarget")(
  function* run(appProjectId: string, intoProjectId: string) {
    const projects = yield* ProjectStore;
    const project = yield* projects.get(intoProjectId);
    const isSameApp = project.appProjectId === appProjectId;

    if (!isSameApp || project.kind !== "html") {
      return yield* new BadRequest({
        message: `${project.name} is not a route copy of this app. Pass the id of a prototype that create_prototype_project made from this app, or leave intoProjectId out.`,
      });
    }

    const directionId = toMainDirectionId(project.directions);
    const main = project.directions.find((item) => item.id === directionId);

    const folder = main?.workTree ?? "";

    const target: RouteTarget = {
      folder,
      project,
      runId: null,
      tokensFile: null,
    };

    return target;
  }
);

const toRouteTarget = Effect.fn("project.createPrototype.toRouteTarget")(
  function* run(input: CreatePrototypeProjectInput, label: RouteLabel) {
    if (input.intoProjectId !== null) {
      return yield* toIntoTarget(input.projectId, input.intoProjectId);
    }

    const writer = yield* ProjectOpsWriter;

    const created: RouteTarget = yield* writer.createPrototype({
      ...input,
      name: toRouteName(input.name, label.sourceRoute),
      shouldStartRun: false,
    });

    return created;
  }
);

const recordRouteSource = Effect.fn(
  "project.createPrototype.recordRouteSource"
)(function* run(
  target: { readonly directionId: string; readonly projectId: string },
  input: CreatePrototypeProjectInput,
  label: RouteLabel,
  copy: RouteCopy
) {
  const sources = yield* RouteSourceWriter;
  const { viewport } = input;

  yield* sources
    .record({
      appProjectId: input.projectId,
      directionId: target.directionId,
      fixtureRoute: label.fixtureRoute,
      frameId: copy.frameId,
      page: copy.page,
      projectId: target.projectId,
      routePath: label.sourceRoute,
      viewport,
    })
    .pipe(Effect.orElseSucceed(() => null));
});

const createRoutePrototype = Effect.fn("project.createPrototype.route")(
  function* run(input: CreatePrototypeProjectInput, rawRoute: string) {
    const routePath = toRoutePath(rawRoute);
    const isKnown = yield* isKnownRoute(input.projectId, routePath);

    if (!isKnown) {
      return yield* new NotFound({
        message: `The app has no route ${routePath}. Read the routes with list_routes.`,
      });
    }

    const upstream = yield* toReadyAppUpstream(input.projectId);
    const label = yield* toRouteLabel(input.projectId, routePath);
    const created = yield* toRouteTarget(input, label);

    const target = {
      directionId: toMainDirectionId(created.project.directions),
      projectId: created.project.id,
    };

    const url = toAppRouteUrl(upstream, routePath);
    const outcome = yield* toCopyOutcome(target, url, input.viewport);

    if (outcome.copy === null) {
      return {
        ...created,
        fixtureOffer: toFixtureOffer(
          input.projectId,
          routePath,
          outcome.failure
        ),
      };
    }

    const { copy } = outcome;
    yield* applyRouteTokens(target, created.folder, copy.page);
    yield* recordRouteSource(target, input, label, copy);

    if (copy.elements <= EMPTY_ELEMENTS_MAX) {
      return {
        ...created,
        fixtureOffer: toFixtureOffer(input.projectId, routePath, EMPTY_REASON),
      };
    }

    if (!input.shouldStartRun) {
      return { ...created, fixtureOffer: null };
    }

    const runs = yield* RunLogWriter;

    const { runId } = yield* runs.start({
      ...target,
      body: toRouteRunBody(input, label, copy),
    });

    return { ...created, fixtureOffer: null, runId };
  }
);

const handle = Effect.fn("project.createPrototype")(function* run(
  input: CreatePrototypeProjectInput
) {
  if (input.routePath !== null) {
    return yield* createRoutePrototype(input, input.routePath);
  }

  if (input.intoProjectId !== null) {
    return yield* new BadRequest({
      message:
        "intoProjectId needs routePath. Pass the route to copy into that project.",
    });
  }

  const writer = yield* ProjectOpsWriter;
  const created = yield* writer.createPrototype(input);

  return { ...created, fixtureOffer: null };
}) satisfies Handle<typeof createPrototypeProject>;

export { handle };
