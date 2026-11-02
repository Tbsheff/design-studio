// @generated
import type { ExportActions } from "../../../shared/actions/export/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as getCodeExportHandle } from "./get-code.js";

const ExportEntries = {
  getCodeExport: { handle: getCodeExportHandle },
} satisfies Entries<typeof ExportActions>;

export { ExportEntries };
