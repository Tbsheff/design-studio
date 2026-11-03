// @generated
import { applyPackPack } from "./apply-pack.js";
import { createDraftPack } from "./create-draft.js";
import { createPackPack } from "./create-pack.js";
import { deletePackPack } from "./delete-pack.js";
import { duplicatePackPack } from "./duplicate-pack.js";
import { exportPackPack } from "./export-pack.js";
import { getDraftPack } from "./get-draft.js";
import { getPackPack } from "./get-pack.js";
import { importPackPack } from "./import-pack.js";
import { inspectDraftPack } from "./inspect-draft.js";
import { inspectPackPack } from "./inspect-pack.js";
import { listProblemPack } from "./list-problem.js";
import { listSummaryPack } from "./list-summary.js";
import { listPack } from "./list.js";
import { publishDraftPack } from "./publish-draft.js";
import { setPackPack } from "./set-pack.js";
import { startEditorPack } from "./start-editor.js";
import { updatePackPack } from "./update-pack.js";

const PackActions = {
  applyPackPack,
  createDraftPack,
  createPackPack,
  deletePackPack,
  duplicatePackPack,
  exportPackPack,
  getDraftPack,
  getPackPack,
  importPackPack,
  inspectDraftPack,
  inspectPackPack,
  listPack,
  listProblemPack,
  listSummaryPack,
  publishDraftPack,
  setPackPack,
  startEditorPack,
  updatePackPack,
} as const;

export { PackActions };
