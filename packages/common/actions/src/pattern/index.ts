// @generated
import { createPattern } from "./create.js";
import { deletePattern } from "./delete.js";
import { getPattern } from "./get.js";
import { importPattern } from "./import.js";
import { insertPattern } from "./insert.js";
import { inspectPattern } from "./inspect.js";
import { listPattern } from "./list.js";

const PatternActions = {
  createPattern,
  deletePattern,
  getPattern,
  importPattern,
  insertPattern,
  inspectPattern,
  listPattern,
} as const;

export { PatternActions };
