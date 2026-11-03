// @generated
import { getDoctorMcpRead } from "./get-doctor.js";
import { getPortPlanMcpRead } from "./get-port-plan.js";
import { getUsageMcpRead } from "./get-usage.js";
import { listFoundAppsMcpRead } from "./list-found-apps.js";
import { listProjectsMcpRead } from "./list-projects.js";
import { listVersionsMcpRead } from "./list-versions.js";
import { searchProjectsMcpRead } from "./search-projects.js";

const McpReadActions = {
  getDoctorMcpRead,
  getPortPlanMcpRead,
  getUsageMcpRead,
  listFoundAppsMcpRead,
  listProjectsMcpRead,
  listVersionsMcpRead,
  searchProjectsMcpRead,
} as const;

export { McpReadActions };
