// @generated
import type { McpReadActions } from "../../../shared/actions/mcp-read/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as getDoctorMcpReadHandle } from "./get-doctor.js";
import { handle as getPortPlanMcpReadHandle } from "./get-port-plan.js";
import { handle as getUsageMcpReadHandle } from "./get-usage.js";
import { handle as listFoundAppsMcpReadHandle } from "./list-found-apps.js";
import { handle as listProjectsMcpReadHandle } from "./list-projects.js";
import { handle as listVersionsMcpReadHandle } from "./list-versions.js";
import { handle as searchProjectsMcpReadHandle } from "./search-projects.js";

const McpReadEntries = {
  getDoctorMcpRead: { handle: getDoctorMcpReadHandle },
  getPortPlanMcpRead: { handle: getPortPlanMcpReadHandle },
  getUsageMcpRead: { handle: getUsageMcpReadHandle },
  listFoundAppsMcpRead: { handle: listFoundAppsMcpReadHandle },
  listProjectsMcpRead: { handle: listProjectsMcpReadHandle },
  listVersionsMcpRead: { handle: listVersionsMcpReadHandle },
  searchProjectsMcpRead: { handle: searchProjectsMcpReadHandle },
} satisfies Entries<typeof McpReadActions>;

export { McpReadEntries };
