// @generated
import { applyToken } from "./apply.js";
import { deleteToken } from "./delete.js";
import { exportToken } from "./export.js";
import { listClassesToken } from "./list-classes.js";
import { listUsageToken } from "./list-usage.js";
import { renameToken } from "./rename.js";
import { setToken } from "./set.js";

const TokenActions = {
  applyToken,
  deleteToken,
  exportToken,
  listClassesToken,
  listUsageToken,
  renameToken,
  setToken,
} as const;

export { TokenActions };
