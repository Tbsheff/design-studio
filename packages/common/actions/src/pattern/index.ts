// @generated
import { createPattern } from "./create.js";
import { deletePattern } from "./delete.js";
import { getPattern } from "./get.js";
import { insertPattern } from "./insert.js";
import { listPattern } from "./list.js";

const PatternActions = {
  createPattern,
  deletePattern,
  getPattern,
  insertPattern,
  listPattern,
} as const;

export { PatternActions };
