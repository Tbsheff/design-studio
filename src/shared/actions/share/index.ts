// @generated
import { createShare } from "./create.js";
import { deleteShare } from "./delete.js";
import { listShare } from "./list.js";
import { setCursorShare } from "./set-cursor.js";
import { setLanShare } from "./set-lan.js";
import { updateShare } from "./update.js";

const ShareActions = {
  createShare,
  deleteShare,
  listShare,
  setCursorShare,
  setLanShare,
  updateShare,
} as const;

export { ShareActions };
