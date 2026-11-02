import type { WireInput } from "../shared/actions/_core/action.js";
import type { getPortPlanMcpRead } from "../shared/actions/mcp-read/get-port-plan.js";
import { routes } from "../shared/actions/mcp-read/routes.js";
import type {
  PortFlowPlan,
  PortPlan,
  PortStartRequest,
  PortStartResult,
} from "../shared/port";
import { PORT_OPEN_EVENT } from "../shared/port";
import { json } from "./api";
import { call } from "./platform/http";

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

async function readPlan<Plan>(
  input: PlanRequest,
  isFlow: boolean
): Promise<Plan> {
  const plan: unknown = await call(
    routes.getPortPlanMcpRead,
    planInput(input, isFlow) as WireInput<typeof getPortPlanMcpRead>
  );

  return plan as Plan;
}

export const portApi = {
  plan: (input: PlanRequest) => readPlan<PortPlan>(input, false),
  flowPlan: (input: PlanRequest) => readPlan<PortFlowPlan>(input, true),
  start: (input: PortStartRequest) =>
    json<PortStartResult>("POST", "/api/port/start", input),
};
