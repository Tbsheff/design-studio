// @generated
import type { WorkspaceActions } from "@design-studio/actions/workspace/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyFixWorkspaceHandle } from "./apply-fix.js";
import { handle as createFolderWorkspaceHandle } from "./create-folder.js";
import {
  handle as deleteFolderWorkspaceHandle,
  preview as deleteFolderWorkspacePreview,
} from "./delete-folder.js";
import { handle as getDesignMdWorkspaceHandle } from "./get-design-md.js";
import { handle as getDoctorWorkspaceHandle } from "./get-doctor.js";
import { handle as getFileWorkspaceHandle } from "./get-file.js";
import { handle as getFoldersWorkspaceHandle } from "./get-folders.js";
import { handle as getFrameHtmlWorkspaceHandle } from "./get-frame-html.js";
import { handle as getPortPlanWorkspaceHandle } from "./get-port-plan.js";
import { handle as getRunContextWorkspaceHandle } from "./get-run-context.js";
import { handle as getScreenshotWorkspaceHandle } from "./get-screenshot.js";
import { handle as getTokensWorkspaceHandle } from "./get-tokens.js";
import { handle as getUsageWorkspaceHandle } from "./get-usage.js";
import { handle as listFilesWorkspaceHandle } from "./list-files.js";
import { handle as listFoundAppsWorkspaceHandle } from "./list-found-apps.js";
import { handle as listProjectsWorkspaceHandle } from "./list-projects.js";
import { handle as listRoutesWorkspaceHandle } from "./list-routes.js";
import { handle as listVariantsWorkspaceHandle } from "./list-variants.js";
import { handle as listVersionsWorkspaceHandle } from "./list-versions.js";
import { handle as renameFolderWorkspaceHandle } from "./rename-folder.js";
import { handle as searchProjectsWorkspaceHandle } from "./search-projects.js";
import { handle as setDefaultFolderWorkspaceHandle } from "./set-default-folder.js";
import { handle as updateFileWorkspaceHandle } from "./update-file.js";

const WorkspaceEntries = {
  applyFixWorkspace: { handle: applyFixWorkspaceHandle },
  createFolderWorkspace: { handle: createFolderWorkspaceHandle },
  deleteFolderWorkspace: {
    handle: deleteFolderWorkspaceHandle,
    preview: deleteFolderWorkspacePreview,
  },
  getDesignMdWorkspace: { handle: getDesignMdWorkspaceHandle },
  getDoctorWorkspace: { handle: getDoctorWorkspaceHandle },
  getFileWorkspace: { handle: getFileWorkspaceHandle },
  getFoldersWorkspace: { handle: getFoldersWorkspaceHandle },
  getFrameHtmlWorkspace: { handle: getFrameHtmlWorkspaceHandle },
  getPortPlanWorkspace: { handle: getPortPlanWorkspaceHandle },
  getRunContextWorkspace: { handle: getRunContextWorkspaceHandle },
  getScreenshotWorkspace: { handle: getScreenshotWorkspaceHandle },
  getTokensWorkspace: { handle: getTokensWorkspaceHandle },
  getUsageWorkspace: { handle: getUsageWorkspaceHandle },
  listFilesWorkspace: { handle: listFilesWorkspaceHandle },
  listFoundAppsWorkspace: { handle: listFoundAppsWorkspaceHandle },
  listProjectsWorkspace: { handle: listProjectsWorkspaceHandle },
  listRoutesWorkspace: { handle: listRoutesWorkspaceHandle },
  listVariantsWorkspace: { handle: listVariantsWorkspaceHandle },
  listVersionsWorkspace: { handle: listVersionsWorkspaceHandle },
  renameFolderWorkspace: { handle: renameFolderWorkspaceHandle },
  searchProjectsWorkspace: { handle: searchProjectsWorkspaceHandle },
  setDefaultFolderWorkspace: { handle: setDefaultFolderWorkspaceHandle },
  updateFileWorkspace: { handle: updateFileWorkspaceHandle },
} satisfies Entries<typeof WorkspaceActions>;

export { WorkspaceEntries };
