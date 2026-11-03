import { routes } from "../shared/actions/workspace/routes.js";
import type {
  PortFlowPlan,
  PortPlan,
  PortStartRequest,
  PortStartResult,
} from "../shared/port";
import { PORT_OPEN_EVENT } from "../shared/port";
import { json } from "./api";
import { call } from "./platform/http";
import type { RouteOutput } from "./platform/http";

export interface PortOpenDetail {
  frameId: string | null;
  directionId: string | null;
}

let available = false;

export function setPortAvailable(on: boolean): void {
  available = on;
}

export function portAvailable(): boolean {
  return available;
}

export function openPortDialog(detail: PortOpenDetail): void {
  window.dispatchEvent(
    new CustomEvent<PortOpenDetail>(PORT_OPEN_EVENT, { detail })
  );
}

type PlanRequest = Omit<PortStartRequest, "route"> & { route?: string };

interface PlanFields {
  directionId?: string;
  flow?: boolean;
  path: string;
  projectId: string;
  route?: string;
  targetProjectId: string;
}

function planInput(input: PlanRequest, isFlow: boolean): PlanFields {
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
}

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

export const portApi = {
  plan: readPagePlan,
  flowPlan: readFlowPlan,
  start: (input: PortStartRequest) =>
    json<PortStartResult>("POST", "/api/port/start", input),
};
