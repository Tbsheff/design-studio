// @generated
import type { PackActions } from "@design-studio/actions/pack/index";

import type { Entries } from "../_core/handler.js";
import {
  handle as applyPackPackHandle,
  preview as applyPackPackPreview,
} from "./apply-pack.js";
import {
  handle as createDraftPackHandle,
  preview as createDraftPackPreview,
} from "./create-draft.js";
import { handle as createPackPackHandle } from "./create-pack.js";
import {
  handle as deletePackPackHandle,
  preview as deletePackPackPreview,
} from "./delete-pack.js";
import { handle as duplicatePackPackHandle } from "./duplicate-pack.js";
import { handle as exportPackPackHandle } from "./export-pack.js";
import { handle as getDraftPackHandle } from "./get-draft.js";
import { handle as getPackPackHandle } from "./get-pack.js";
import { handle as importPackPackHandle } from "./import-pack.js";
import { handle as inspectDraftPackHandle } from "./inspect-draft.js";
import { handle as inspectPackPackHandle } from "./inspect-pack.js";
import { handle as listProblemPackHandle } from "./list-problem.js";
import { handle as listSummaryPackHandle } from "./list-summary.js";
import { handle as listPackHandle } from "./list.js";
import { handle as publishDraftPackHandle } from "./publish-draft.js";
import { handle as setPackPackHandle } from "./set-pack.js";
import { handle as startEditorPackHandle } from "./start-editor.js";
import { handle as updatePackPackHandle } from "./update-pack.js";

const PackEntries = {
  applyPackPack: { handle: applyPackPackHandle, preview: applyPackPackPreview },
  createDraftPack: {
    handle: createDraftPackHandle,
    preview: createDraftPackPreview,
  },
  createPackPack: { handle: createPackPackHandle },
  deletePackPack: {
    handle: deletePackPackHandle,
    preview: deletePackPackPreview,
  },
  duplicatePackPack: { handle: duplicatePackPackHandle },
  exportPackPack: { handle: exportPackPackHandle },
  getDraftPack: { handle: getDraftPackHandle },
  getPackPack: { handle: getPackPackHandle },
  importPackPack: { handle: importPackPackHandle },
  inspectDraftPack: { handle: inspectDraftPackHandle },
  inspectPackPack: { handle: inspectPackPackHandle },
  listPack: { handle: listPackHandle },
  listProblemPack: { handle: listProblemPackHandle },
  listSummaryPack: { handle: listSummaryPackHandle },
  publishDraftPack: { handle: publishDraftPackHandle },
  setPackPack: { handle: setPackPackHandle },
  startEditorPack: { handle: startEditorPackHandle },
  updatePackPack: { handle: updatePackPackHandle },
} satisfies Entries<typeof PackActions>;

export { PackEntries };
