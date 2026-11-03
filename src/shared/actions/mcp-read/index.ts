// @generated
import { getDoctorMcpRead } from "./get-doctor.js";
import { getPortPlanMcpRead } from "./get-port-plan.js";
import { getUsageMcpRead } from "./get-usage.js";
import { listFilesMcpRead } from "./list-files.js";
import { listFoundAppsMcpRead } from "./list-found-apps.js";
import { listProjectsMcpRead } from "./list-projects.js";
import { listRoutesMcpRead } from "./list-routes.js";
import { listVariantsMcpRead } from "./list-variants.js";
import { listVersionsMcpRead } from "./list-versions.js";
import { readFileMcpRead } from "./read-file.js";
import { searchProjectsMcpRead } from "./search-projects.js";

const McpReadActions = {
  getDoctorMcpRead,
  getPortPlanMcpRead,
  getUsageMcpRead,
  listFilesMcpRead,
  listFoundAppsMcpRead,
  listProjectsMcpRead,
  listRoutesMcpRead,
  listVariantsMcpRead,
  listVersionsMcpRead,
  readFileMcpRead,
  searchProjectsMcpRead,
} as const;

export { McpReadActions };
