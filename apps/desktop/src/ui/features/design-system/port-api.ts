import { routes as portRoutes } from "@design-studio/actions/port/routes";
import { routes } from "@design-studio/actions/workspace/routes";
import type {
  PortFlowPlan,
  PortPlan,
  PortStartRequest,
  PortStartResult,
} from "@design-studio/contracts/port";
import { PORT_OPEN_EVENT } from "@design-studio/contracts/port";

import { call } from "../../platform/http.js";
import type { RouteInput, RouteOutput } from "../../platform/http.js";

interface PortOpenDetail {
  frameId: string | null;
  directionId: string | null;
}

let available = false;

const setPortAvailable = (on: boolean): void => {
  available = on;
};

const portAvailable = (): boolean => available;

const openPortDialog = (detail: PortOpenDetail): void => {
  globalThis.dispatchEvent(
    new CustomEvent<PortOpenDetail>(PORT_OPEN_EVENT, { detail })
  );
};

type PlanRequest = Omit<PortStartRequest, "route"> & { route?: string };

interface PlanFields {
  directionId?: string;
  flow?: boolean;
  path: string;
  projectId: string;
  route?: string;
  targetProjectId: string;
}

const planInput = (input: PlanRequest, isFlow: boolean): PlanFields => {
  const fields: PlanFields = {
    path: input.path,
    projectId: input.sourceProjectId,
    targetProjectId: input.targetProjectId,
  };

  if (input.sourceDirectionId) {
    fields.directionId = input.sourceDirectionId;
  }

  if (input.route) {
    fields.route = input.route;
  }

  if (isFlow) {
    fields.flow = true;
  }

  return fields;
};

type PlanWire = RouteOutput<typeof routes.getPortPlanWorkspace>;

const isFlowPlan = (plan: PlanWire): plan is PlanWire & PortFlowPlan =>
  Array.isArray(plan.pages);

const isPagePlan = (plan: PlanWire): plan is PlanWire & PortPlan =>
  Array.isArray(plan.sections);

const readPagePlan = async (input: PlanRequest): Promise<PortPlan> => {
  const plan = await call(routes.getPortPlanWorkspace, planInput(input, false));

  if (!isPagePlan(plan)) {
    throw new Error("The server sent a flow plan for a page plan request.");
  }

  return plan;
};

const readFlowPlan = async (input: PlanRequest): Promise<PortFlowPlan> => {
  const plan = await call(routes.getPortPlanWorkspace, planInput(input, true));

  if (!isFlowPlan(plan)) {
    throw new Error("The server sent a page plan for a flow plan request.");
  }

  return plan;
};

type StartFields = RouteInput<typeof portRoutes.startPort>;

const toStartInput = (input: PortStartRequest): StartFields => {
  const fields: StartFields = {
    directionId: input.sourceDirectionId,
    path: input.path,
    paths: input.paths,
    projectId: input.sourceProjectId,
    route: input.route,
    targetProjectId: input.targetProjectId,
  };

  return fields;
};

const startPortRun = (input: PortStartRequest): Promise<PortStartResult> =>
  call(portRoutes.startPort, toStartInput(input));

const portApi = {
  flowPlan: readFlowPlan,
  plan: readPagePlan,
  start: startPortRun,
};

export { setPortAvailable, portAvailable, openPortDialog, portApi };

export type { PortOpenDetail };
