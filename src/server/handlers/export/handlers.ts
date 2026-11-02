// @generated
import type { ExportActions } from "../../../shared/actions/export/index.js";
import type { Entries } from "../_core/handler.js";
import {
  handle as exportFolderExportHandle,
  preview as exportFolderExportPreview,
} from "./export-folder.js";
import { handle as exportFrameExportHandle } from "./export-frame.js";
import { handle as exportHandoffExportHandle } from "./export-handoff.js";
import { handle as exportExportHandle } from "./export.js";
import { handle as getCodeExportHandle } from "./get-code.js";
import { handle as getHandoffExportHandle } from "./get-handoff.js";

const ExportEntries = {
  exportExport: { handle: exportExportHandle },
  exportFolderExport: {
    handle: exportFolderExportHandle,
    preview: exportFolderExportPreview,
  },
  exportFrameExport: { handle: exportFrameExportHandle },
  exportHandoffExport: { handle: exportHandoffExportHandle },
  getCodeExport: { handle: getCodeExportHandle },
  getHandoffExport: { handle: getHandoffExportHandle },
} satisfies Entries<typeof ExportActions>;

export { ExportEntries };
