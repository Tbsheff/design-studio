import type {
  Direction,
  Project,
  RunLevel,
  RunRequest,
} from "@design-studio/contracts";
import {
  cleanPortRoute,
  PORT_FLOW_MAX_PAGES,
  PORT_TASK,
} from "@design-studio/contracts/port";
import type {
  PortFlowPlan,
  PortStartResult,
} from "@design-studio/contracts/port";

import { BadRequestError, ConflictError } from "../platform/errors/index.js";
import type { PortRunCall } from "../run-log/index.js";
import { applyPortAssets, deletePortAssets } from "./port-assets.js";
import type { PortAssetCopy } from "./port-assets.js";
import { listPortLooks, toPortLookPage } from "./port-look.js";
import {
  buildFlowPlan,
  buildPortPlan,
  readSourcePage,
  sourcePagePath,
} from "./port-plan.js";
import type { PortPlanInput } from "./port-plan.js";
import { toStartTag } from "./port-review-snapshot.js";
import { toRouteUpdate, toUpdatedPrompt } from "./port-route-update.js";
import { toFlowPrompt, toPagePrompt } from "./port-start-prompt.js";
import type { StartableInput } from "./port-start-prompt.js";

interface PortStartDeps {
  readonly isRunning: (projectId: string, directionId: string) => boolean;
  readonly projects: {
    readonly directionOf: (project: Project, id: string) => Direction;
    readonly get: (projectId: string) => Promise<Project>;
    readonly mainDirection: (project: Project) => Direction;
  };
  readonly startRun: (
    project: Project,
    direction: Direction,
    request: RunRequest
  ) => Promise<string>;
}

interface PortPlanSource {
  readonly path: string;
  readonly route: string | null;
  readonly sourceDirectionId: string | null;
  readonly sourceProjectId: string;
  readonly targetProjectId: string | null;
}

const toPortPlanInput = async (
  projects: PortStartDeps["projects"],
  query: PortPlanSource
): Promise<PortPlanInput> => {
  const source = await projects.get(query.sourceProjectId);
  let sourceDirection = projects.mainDirection(source);

  if (query.sourceDirectionId !== null) {
    sourceDirection = projects.directionOf(source, query.sourceDirectionId);
  }

  if (query.targetProjectId === null) {
    return {
      source: { direction: sourceDirection, path: query.path, project: source },
      target: null,
    };
  }

  const targetProject = await projects.get(query.targetProjectId);

  return {
    source: { direction: sourceDirection, path: query.path, project: source },
    target: {
      direction: projects.mainDirection(targetProject),
      project: targetProject,
      route: query.route,
    },
  };
};

const toStartRoute = (raw: string): string => {
  const route = cleanPortRoute(raw.trim());

  if (!route) {
    throw new BadRequestError(
      "route must be an app path like /classes or /(design)/classes: lower-case letters, digits and dashes"
    );
  }

  return route;
};

const toStartPaths = (raw: readonly string[] | null): string[] | null => {
  if (raw === null) {
    return null;
  }

  const cleanPaths: string[] = [];

  for (const item of raw) {
    const trimmed = item.trim();

    if (trimmed !== "") {
      cleanPaths.push(sourcePagePath(trimmed));
    }
  }

  const paths = [...new Set(cleanPaths)];

  if (paths.length > PORT_FLOW_MAX_PAGES) {
    throw new BadRequestError(
      `paths can list at most ${PORT_FLOW_MAX_PAGES} pages`
    );
  }

  if (paths.length === 0) {
    return null;
  }

  return paths;
};

const toStartableInput = (
  deps: PortStartDeps,
  input: PortPlanInput
): StartableInput => {
  const { target } = input;

  if (!target) {
    throw new BadRequestError("targetProjectId is required");
  }

  if (!target.project.app) {
    throw new BadRequestError(
      `${target.project.name} is not an attached app. Pick a project made with Open app.`
    );
  }

  if (!target.route) {
    throw new BadRequestError("route is required");
  }

  if (target.project.id === input.source.project.id) {
    throw new BadRequestError(
      "The target app must be another project than the prototype."
    );
  }

  if (deps.isRunning(target.project.id, target.direction.id)) {
    throw new ConflictError(
      `A run is in progress in ${target.project.name}. Try again when it finishes.`
    );
  }

  return {
    ...input,
    target: {
      direction: target.direction,
      project: target.project,
      route: target.route,
    },
  };
};

const toTakenText = (flow: PortFlowPlan): string => {
  const taken: string[] = [];

  for (const page of flow.pages) {
    if (page.routeExists) {
      taken.push([page.route, " (", page.routeFile ?? "", ")"].join(""));
    }
  }

  return taken.join(", ");
};

const toRunLevel = (project: Project): RunLevel => {
  if (project.settings.defaultLevel === "wireframe") {
    return "prototype";
  }

  return project.settings.defaultLevel;
};

const toPortRequest = (project: Project, promptText: string): RunRequest =>
  ({
    level: toRunLevel(project),
    mode: "edit",
    prompt: promptText,
    task: PORT_TASK,
  }) satisfies RunRequest;

const toStartResult = (
  runId: string,
  input: StartableInput,
  routeFile: string | null,
  routes: PortStartResult["routes"]
): PortStartResult => ({
  directionId: input.target.direction.id,
  projectId: input.target.project.id,
  route: input.target.route,
  routeFile,
  routes,
  runId,
});

const toCopyAssets = (
  input: StartableInput,
  assetRoute: string,
  assetPages: readonly { readonly html: string; readonly path: string }[]
): Promise<PortAssetCopy> =>
  applyPortAssets({
    appDir: input.target.project.app?.appDir ?? "",
    pages: assetPages,
    route: assetRoute,
    sourceWorkTree: input.source.direction.workTree,
    targetWorkTree: input.target.direction.workTree,
  });

const startAssetRun = async (
  deps: PortStartDeps,
  input: StartableInput,
  assets: PortAssetCopy,
  promptText: string
): Promise<string> => {
  const { direction, project } = input.target;
  const startTag = await toStartTag(direction.workTree);

  try {
    return await deps.startRun(
      project,
      direction,
      toPortRequest(project, `${promptText}${startTag}`)
    );
  } catch (error) {
    await deletePortAssets(assets.written);

    throw error;
  }
};

const startFlowRun = async (
  deps: PortStartDeps,
  input: StartableInput,
  paths: string[] | null
): Promise<PortStartResult> => {
  const flow = await buildFlowPlan({ ...input, paths });

  if (flow.pages.length === 0) {
    throw new BadRequestError("Pick at least one page to move.");
  }

  const taken = toTakenText(flow);

  if (taken !== "") {
    throw new ConflictError(
      `The app already has ${taken}. Pick a new base path.`
    );
  }

  const htmls = await Promise.all(
    flow.pages.map((page) =>
      readSourcePage(input.source.direction.workTree, page.path)
    )
  );

  const pages = flow.pages.map((page, index) => ({
    html: htmls[index] ?? "",
    path: page.path,
  }));

  const [assets, sources] = await Promise.all([
    toCopyAssets(input, flow.base ?? input.target.route, pages),
    listPortLooks(input, pages),
  ]);

  const runId = await startAssetRun(
    deps,
    input,
    assets,
    toFlowPrompt(input, flow, sources, assets)
  );

  return toStartResult(
    runId,
    input,
    flow.pages[0]?.routeFile ?? null,
    flow.pages.map((page) => ({
      path: page.path,
      route: page.route,
      routeFile: page.routeFile,
    }))
  );
};

const startPageRun = async (
  deps: PortStartDeps,
  input: StartableInput
): Promise<PortStartResult> => {
  const plan = await buildPortPlan(input);

  const [update, html] = await Promise.all([
    toRouteUpdate(input, plan),
    readSourcePage(input.source.direction.workTree, input.source.path),
  ]);

  const page = { html, path: input.source.path };

  const [assets, source] = await Promise.all([
    toCopyAssets(input, input.target.route, [page]),
    toPortLookPage(input, page),
  ]);

  const runId = await startAssetRun(
    deps,
    input,
    assets,
    toUpdatedPrompt(toPagePrompt(input, plan, source, assets), update)
  );

  const routeFile = plan.target?.routeFile ?? null;

  return toStartResult(runId, input, routeFile, [
    { path: input.source.path, route: input.target.route, routeFile },
  ]);
};

const isFlowCall = (
  call: PortRunCall,
  path: string,
  paths: string[] | null
): boolean => {
  if (call.flow) {
    return true;
  }

  return paths !== null && !(paths.length === 1 && paths[0] === path);
};

const startPortRun = async (
  deps: PortStartDeps,
  call: PortRunCall
): Promise<PortStartResult> => {
  const path = sourcePagePath(call.path ?? "");
  const paths = toStartPaths(call.paths);

  const input = toStartableInput(
    deps,
    await toPortPlanInput(deps.projects, {
      path,
      route: toStartRoute(call.route),
      sourceDirectionId: call.directionId,
      sourceProjectId: call.projectId,
      targetProjectId: call.targetProjectId,
    })
  );

  if (isFlowCall(call, path, paths)) {
    return startFlowRun(deps, input, paths);
  }

  return startPageRun(deps, input);
};

export { startPortRun, toPortPlanInput };

export type { PortPlanSource, PortStartDeps };
