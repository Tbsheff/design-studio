// @generated
import { getDoctorMcpRead } from "./get-doctor.js";
import { getPortPlanMcpRead } from "./get-port-plan.js";
import { getUsageMcpRead } from "./get-usage.js";

const McpReadActions = {
  getDoctorMcpRead,
  getPortPlanMcpRead,
  getUsageMcpRead,
} as const;

export { McpReadActions };
