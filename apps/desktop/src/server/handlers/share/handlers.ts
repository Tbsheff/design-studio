// @generated
import type { ShareActions } from "@design-studio/actions/share/index";

import type { Entries } from "../_core/handler.js";
import {
  handle as createShareHandle,
  preview as createSharePreview,
} from "./create.js";
import {
  handle as deleteShareHandle,
  preview as deleteSharePreview,
} from "./delete.js";
import { handle as listShareHandle } from "./list.js";
import { handle as setCursorShareHandle } from "./set-cursor.js";
import { handle as setLanShareHandle } from "./set-lan.js";
import { handle as updateShareHandle } from "./update.js";

const ShareEntries = {
  createShare: { handle: createShareHandle, preview: createSharePreview },
  deleteShare: { handle: deleteShareHandle, preview: deleteSharePreview },
  listShare: { handle: listShareHandle },
  setCursorShare: { handle: setCursorShareHandle },
  setLanShare: { handle: setLanShareHandle },
  updateShare: { handle: updateShareHandle },
} satisfies Entries<typeof ShareActions>;

export { ShareEntries };
