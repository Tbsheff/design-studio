// @generated
import { getDesignMdMcpRead } from "./get-design-md.js";
import { getDoctorMcpRead } from "./get-doctor.js";
import { getFileMcpRead } from "./get-file.js";
import { getFrameHtmlMcpRead } from "./get-frame-html.js";
import { getPortPlanMcpRead } from "./get-port-plan.js";
import { getRunContextMcpRead } from "./get-run-context.js";
import { getScreenshotMcpRead } from "./get-screenshot.js";
import { getTokensMcpRead } from "./get-tokens.js";
import { getUsageMcpRead } from "./get-usage.js";
import { listFilesMcpRead } from "./list-files.js";
import { listFoundAppsMcpRead } from "./list-found-apps.js";
import { listProjectsMcpRead } from "./list-projects.js";
import { listRoutesMcpRead } from "./list-routes.js";
import { listVariantsMcpRead } from "./list-variants.js";
import { listVersionsMcpRead } from "./list-versions.js";
import { searchProjectsMcpRead } from "./search-projects.js";

const McpReadActions = {
  getDesignMdMcpRead,
  getDoctorMcpRead,
  getFileMcpRead,
  getFrameHtmlMcpRead,
  getPortPlanMcpRead,
  getRunContextMcpRead,
  getScreenshotMcpRead,
  getTokensMcpRead,
  getUsageMcpRead,
  listFilesMcpRead,
  listFoundAppsMcpRead,
  listProjectsMcpRead,
  listRoutesMcpRead,
  listVariantsMcpRead,
  listVersionsMcpRead,
  searchProjectsMcpRead,
} as const;

export { McpReadActions };
