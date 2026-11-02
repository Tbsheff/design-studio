// @generated
import { applyPackPacks } from "./apply-pack.js";
import { createDraftPacks } from "./create-draft.js";
import { createPackPacks } from "./create-pack.js";
import { deletePackPacks } from "./delete-pack.js";
import { duplicatePackPacks } from "./duplicate-pack.js";
import { exportPackPacks } from "./export-pack.js";
import { getDraftPacks } from "./get-draft.js";
import { getPackPacks } from "./get-pack.js";
import { importPackPacks } from "./import-pack.js";
import { inspectDraftPacks } from "./inspect-draft.js";
import { inspectPackPacks } from "./inspect-pack.js";
import { listProblemPacks } from "./list-problem.js";
import { listSummaryPacks } from "./list-summary.js";
import { listPacks } from "./list.js";
import { publishDraftPacks } from "./publish-draft.js";
import { setPackPacks } from "./set-pack.js";
import { startEditorPacks } from "./start-editor.js";
import { updatePackPacks } from "./update-pack.js";

const PacksActions = {
  applyPackPacks,
  createDraftPacks,
  createPackPacks,
  deletePackPacks,
  duplicatePackPacks,
  exportPackPacks,
  getDraftPacks,
  getPackPacks,
  importPackPacks,
  inspectDraftPacks,
  inspectPackPacks,
  listPacks,
  listProblemPacks,
  listSummaryPacks,
  publishDraftPacks,
  setPackPacks,
  startEditorPacks,
  updatePackPacks,
} as const;

export { PacksActions };
