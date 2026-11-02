// @generated
import type { PacksActions } from "../../../shared/actions/packs/index.js";
import type { Entries } from "../_core/handler.js";
import {
  handle as applyPackPacksHandle,
  preview as applyPackPacksPreview,
} from "./apply-pack.js";
import {
  handle as createDraftPacksHandle,
  preview as createDraftPacksPreview,
} from "./create-draft.js";
import { handle as createPackPacksHandle } from "./create-pack.js";
import {
  handle as deletePackPacksHandle,
  preview as deletePackPacksPreview,
} from "./delete-pack.js";
import { handle as duplicatePackPacksHandle } from "./duplicate-pack.js";
import { handle as exportPackPacksHandle } from "./export-pack.js";
import { handle as getDraftPacksHandle } from "./get-draft.js";
import { handle as getPackPacksHandle } from "./get-pack.js";
import { handle as importPackPacksHandle } from "./import-pack.js";
import { handle as inspectDraftPacksHandle } from "./inspect-draft.js";
import { handle as inspectPackPacksHandle } from "./inspect-pack.js";
import { handle as listProblemPacksHandle } from "./list-problem.js";
import { handle as listSummaryPacksHandle } from "./list-summary.js";
import { handle as listPacksHandle } from "./list.js";
import { handle as publishDraftPacksHandle } from "./publish-draft.js";
import { handle as setPackPacksHandle } from "./set-pack.js";
import { handle as startEditorPacksHandle } from "./start-editor.js";
import { handle as updatePackPacksHandle } from "./update-pack.js";

const PacksEntries = {
  applyPackPacks: {
    handle: applyPackPacksHandle,
    preview: applyPackPacksPreview,
  },
  createDraftPacks: {
    handle: createDraftPacksHandle,
    preview: createDraftPacksPreview,
  },
  createPackPacks: { handle: createPackPacksHandle },
  deletePackPacks: {
    handle: deletePackPacksHandle,
    preview: deletePackPacksPreview,
  },
  duplicatePackPacks: { handle: duplicatePackPacksHandle },
  exportPackPacks: { handle: exportPackPacksHandle },
  getDraftPacks: { handle: getDraftPacksHandle },
  getPackPacks: { handle: getPackPacksHandle },
  importPackPacks: { handle: importPackPacksHandle },
  inspectDraftPacks: { handle: inspectDraftPacksHandle },
  inspectPackPacks: { handle: inspectPackPacksHandle },
  listPacks: { handle: listPacksHandle },
  listProblemPacks: { handle: listProblemPacksHandle },
  listSummaryPacks: { handle: listSummaryPacksHandle },
  publishDraftPacks: { handle: publishDraftPacksHandle },
  setPackPacks: { handle: setPackPacksHandle },
  startEditorPacks: { handle: startEditorPacksHandle },
  updatePackPacks: { handle: updatePackPacksHandle },
} satisfies Entries<typeof PacksActions>;

export { PacksEntries };
