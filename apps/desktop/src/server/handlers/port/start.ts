import type { Input } from "@design-studio/actions/_core/action";
import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { startPort } from "@design-studio/actions/port/start";
import type { PortFlowPlan, PortPlan } from "@design-studio/contracts/port";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import { RunLogWriter } from "../../run-log/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type StartPortInput = Input<typeof startPort>;

interface PortCardRoute {
  readonly path: string;
  readonly route: string;
  readonly routeExists: boolean;
  readonly routeFile: string | null;
}

const isFlowInput = (input: StartPortInput): boolean => {
  if (input.flow === true) {
    return true;
  }

  const paths = input.paths ?? [];

  return paths.length > 1 || (paths.length === 1 && paths[0] !== input.path);
};

const toCardRoutes = (plan: PortFlowPlan | PortPlan): PortCardRoute[] => {
  if ("pages" in plan) {
    return plan.pages.map((page) => ({
      path: page.path,
      route: page.route,
      routeExists: page.routeExists,
      routeFile: page.routeFile,
    }));
  }

  return [
    {
      path: plan.source.path,
      route: plan.target?.route ?? "",
      routeExists: plan.target?.routeExists ?? false,
      routeFile: plan.target?.routeFile ?? null,
    },
  ];
};

const toTakenRoutes = (routes: readonly PortCardRoute[]): string[] => {
  const taken: string[] = [];

  for (const route of routes) {
    if (route.routeExists) {
      taken.push(
        [route.route, " (", route.routeFile ?? route.path, ")"].join("")
      );
    }
  }

  return taken;
};

const toCardLine = (route: PortCardRoute): string =>
  `${route.path} to ${route.route}: writes ${route.routeFile ?? "a new route file"}`;

const toPortCard = (
  appName: string,
  routes: readonly PortCardRoute[]
): ApprovalCard => ({
  action: "Start a port run",
  detail: `The studio agent starts one run in ${appName} and writes these files:\n${routes.map((route) => toCardLine(route)).join("\n")}\nUndo takes the run back.`,
  title: `Move ${routes.length} prototype page(s) into ${appName}`,
});

const handle = Effect.fn("port.start")(function* run(input: StartPortInput) {
  const writer = yield* RunLogWriter;

  const started = yield* writer.startPort({
    directionId: input.directionId ?? null,
    flow: input.flow === true,
    path: input.path ?? null,
    paths: input.paths ?? null,
    projectId: input.projectId,
    route: input.route,
    targetProjectId: input.targetProjectId,
  });

  return { ...started, routes: started.routes ?? [] };
}) satisfies Handle<typeof startPort>;

const preview = Effect.fn("port.start.preview")(function* card(
  input: StartPortInput
) {
  const store = yield* McpReadStore;
  const isFlow = isFlowInput(input);
  let flowPaths: readonly string[] | null = null;

  if (isFlow) {
    flowPaths = input.paths ?? null;
  }

  const plan = yield* store.portPlan({
    flow: isFlow,
    path: input.path ?? null,
    paths: flowPaths,
    route: input.route,
    sourceDirectionId: input.directionId ?? null,
    sourceProjectId: input.projectId,
    targetProjectId: input.targetProjectId,
  });

  const routes = toCardRoutes(plan);
  const taken = toTakenRoutes(routes);

  if (taken.length > 0) {
    return yield* new Conflict({
      message: `The app already has ${taken.join(", ")}. Pick a new route.`,
    });
  }

  return toPortCard(plan.target?.name ?? input.targetProjectId, routes);
}) satisfies Preview<typeof startPort>;

export { handle, preview };
