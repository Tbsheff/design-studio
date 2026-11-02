// @generated
import type { McpReadActions } from "../../../shared/actions/mcp-read/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as getDoctorMcpReadHandle } from "./get-doctor.js";
import { handle as getPortPlanMcpReadHandle } from "./get-port-plan.js";
import { handle as getUsageMcpReadHandle } from "./get-usage.js";

const McpReadEntries = {
  getDoctorMcpRead: { handle: getDoctorMcpReadHandle },
  getPortPlanMcpRead: { handle: getPortPlanMcpReadHandle },
  getUsageMcpRead: { handle: getUsageMcpReadHandle },
} satisfies Entries<typeof McpReadActions>;

export { McpReadEntries };
