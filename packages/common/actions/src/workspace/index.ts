// @generated
import { applyFixWorkspace } from "./apply-fix.js";
import { createFolderWorkspace } from "./create-folder.js";
import { deleteFolderWorkspace } from "./delete-folder.js";
import { getDesignMdWorkspace } from "./get-design-md.js";
import { getDoctorWorkspace } from "./get-doctor.js";
import { getFileWorkspace } from "./get-file.js";
import { getFoldersWorkspace } from "./get-folders.js";
import { getFrameHtmlWorkspace } from "./get-frame-html.js";
import { getPortPlanWorkspace } from "./get-port-plan.js";
import { getRunContextWorkspace } from "./get-run-context.js";
import { getScreenshotWorkspace } from "./get-screenshot.js";
import { getTokensWorkspace } from "./get-tokens.js";
import { getUsageWorkspace } from "./get-usage.js";
import { listFilesWorkspace } from "./list-files.js";
import { listFoundAppsWorkspace } from "./list-found-apps.js";
import { listProjectsWorkspace } from "./list-projects.js";
import { listRoutesWorkspace } from "./list-routes.js";
import { listVariantsWorkspace } from "./list-variants.js";
import { listVersionsWorkspace } from "./list-versions.js";
import { renameFolderWorkspace } from "./rename-folder.js";
import { searchProjectsWorkspace } from "./search-projects.js";
import { setDefaultFolderWorkspace } from "./set-default-folder.js";
import { updateFileWorkspace } from "./update-file.js";

const WorkspaceActions = {
  applyFixWorkspace,
  createFolderWorkspace,
  deleteFolderWorkspace,
  getDesignMdWorkspace,
  getDoctorWorkspace,
  getFileWorkspace,
  getFoldersWorkspace,
  getFrameHtmlWorkspace,
  getPortPlanWorkspace,
  getRunContextWorkspace,
  getScreenshotWorkspace,
  getTokensWorkspace,
  getUsageWorkspace,
  listFilesWorkspace,
  listFoundAppsWorkspace,
  listProjectsWorkspace,
  listRoutesWorkspace,
  listVariantsWorkspace,
  listVersionsWorkspace,
  renameFolderWorkspace,
  searchProjectsWorkspace,
  setDefaultFolderWorkspace,
  updateFileWorkspace,
} as const;

export { WorkspaceActions };
