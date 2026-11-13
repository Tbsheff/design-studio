import type {
  Direction,
  Project,
  RunLevel,
  RunRequest,
} from "@design-studio/contracts";
import {
  cleanPortRoute,
  PORT_FLOW_MAX_PAGES,
  PORT_LEVEL_LABEL,
  PORT_TASK,
} from "@design-studio/contracts/port";
import type {
  PortFlowPlan,
  PortPlan,
  PortStartResult,
} from "@design-studio/contracts/port";

import { BadRequestError, ConflictError } from "../platform/errors/index.js";
import type { PortRunCall } from "../run-log/index.js";
import {
  buildFlowPlan,
  buildPortPlan,
  portFlowText,
  portPlanText,
  readSourcePage,
  sourcePagePath,
} from "./port-plan.js";
import type { PortPlanInput } from "./port-plan.js";

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

interface StartableTarget {
  readonly direction: Direction;
  readonly project: Project;
  readonly route: string;
}

type StartableInput = PortPlanInput & { readonly target: StartableTarget };

const SOURCE_TEXT_MAX = 24_000;

const FLOW_SOURCE_MAX = 64_000;

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

const toTagged = (tag: string, attributes: string, body: string): string =>
  ["<", tag, attributes, ">\n", body, "\n</", tag, ">"].join("");

const toPathAttribute = (path: string): string =>
  [' path="', path, '"'].join("");

const toRunLevel = (project: Project): RunLevel => {
  if (project.settings.defaultLevel === "wireframe") {
    return "prototype";
  }

  return project.settings.defaultLevel;
};

const toCutSource = (html: string, max: number): string => {
  if (html.length <= max) {
    return html;
  }

  return `${html.slice(0, max)}\n<!-- source cut at ${max} characters -->`;
};

const toPagePrompt = (
  input: StartableInput,
  plan: PortPlan,
  html: string
): string => {
  const routeFile = plan.target?.routeFile ?? null;
  let file = "";

  if (routeFile) {
    file = ` (file \`${routeFile}\`)`;
  }

  return [
    `${PORT_LEVEL_LABEL}: move the prototype page ${plan.source.path} from the project "${input.source.project.name}" into this app as the route ${input.target.route}${file}.`,
    toTagged("port-plan", "", portPlanText(plan)),
    toTagged(
      "prototype-source",
      toPathAttribute(plan.source.path),
      toCutSource(html, SOURCE_TEXT_MAX)
    ),
  ].join("\n\n");
};

const toFlowPrompt = async (
  input: StartableInput,
  flow: PortFlowPlan
): Promise<string> => {
  const max = Math.min(
    SOURCE_TEXT_MAX,
    Math.floor(FLOW_SOURCE_MAX / Math.max(1, flow.pages.length))
  );

  const pages = await Promise.all(
    flow.pages.map(async (page) => {
      const html = await readSourcePage(
        input.source.direction.workTree,
        page.path
      );

      const attribute = toPathAttribute(page.path);

      return [
        toTagged("port-plan", attribute, portPlanText(page.plan)),
        toTagged("prototype-source", attribute, toCutSource(html, max)),
      ].join("\n\n");
    })
  );

  const files = flow.pages
    .map((page) => `\`${page.routeFile ?? page.route}\``)
    .join(", ");

  return [
    `${PORT_LEVEL_LABEL}: move the ${flow.pages.length} prototype pages of a flow from the project "${input.source.project.name}" into this app as ${flow.pages.length} routes under ${flow.base}. Write these route files: ${files}.`,
    toTagged("port-flow", "", portFlowText(flow)),
    ...pages,
  ].join("\n\n");
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

  const { direction, project } = input.target;

  const runId = await deps.startRun(
    project,
    direction,
    toPortRequest(project, await toFlowPrompt(input, flow))
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

  if (plan.target?.routeExists) {
    throw new ConflictError(
      `The app already has the route ${input.target.route} (${plan.target.routeFile}). Pick a new path.`
    );
  }

  const html = await readSourcePage(
    input.source.direction.workTree,
    input.source.path
  );

  const { direction, project } = input.target;

  const runId = await deps.startRun(
    project,
    direction,
    toPortRequest(project, toPagePrompt(input, plan, html))
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
