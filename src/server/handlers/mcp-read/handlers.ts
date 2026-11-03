// @generated
import type { McpReadActions } from "../../../shared/actions/mcp-read/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as getDesignMdMcpReadHandle } from "./get-design-md.js";
import { handle as getDoctorMcpReadHandle } from "./get-doctor.js";
import { handle as getFrameHtmlMcpReadHandle } from "./get-frame-html.js";
import { handle as getPortPlanMcpReadHandle } from "./get-port-plan.js";
import { handle as getScreenshotMcpReadHandle } from "./get-screenshot.js";
import { handle as getTokensMcpReadHandle } from "./get-tokens.js";
import { handle as getUsageMcpReadHandle } from "./get-usage.js";
import { handle as listFilesMcpReadHandle } from "./list-files.js";
import { handle as listFoundAppsMcpReadHandle } from "./list-found-apps.js";
import { handle as listProjectsMcpReadHandle } from "./list-projects.js";
import { handle as listRoutesMcpReadHandle } from "./list-routes.js";
import { handle as listVariantsMcpReadHandle } from "./list-variants.js";
import { handle as listVersionsMcpReadHandle } from "./list-versions.js";
import { handle as readFileMcpReadHandle } from "./read-file.js";
import { handle as searchProjectsMcpReadHandle } from "./search-projects.js";

const McpReadEntries = {
  getDesignMdMcpRead: { handle: getDesignMdMcpReadHandle },
  getDoctorMcpRead: { handle: getDoctorMcpReadHandle },
  getFrameHtmlMcpRead: { handle: getFrameHtmlMcpReadHandle },
  getPortPlanMcpRead: { handle: getPortPlanMcpReadHandle },
  getScreenshotMcpRead: { handle: getScreenshotMcpReadHandle },
  getTokensMcpRead: { handle: getTokensMcpReadHandle },
  getUsageMcpRead: { handle: getUsageMcpReadHandle },
  listFilesMcpRead: { handle: listFilesMcpReadHandle },
  listFoundAppsMcpRead: { handle: listFoundAppsMcpReadHandle },
  listProjectsMcpRead: { handle: listProjectsMcpReadHandle },
  listRoutesMcpRead: { handle: listRoutesMcpReadHandle },
  listVariantsMcpRead: { handle: listVariantsMcpReadHandle },
  listVersionsMcpRead: { handle: listVersionsMcpReadHandle },
  readFileMcpRead: { handle: readFileMcpReadHandle },
  searchProjectsMcpRead: { handle: searchProjectsMcpReadHandle },
} satisfies Entries<typeof McpReadActions>;

export { McpReadEntries };
