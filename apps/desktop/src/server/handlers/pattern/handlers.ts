// @generated
import type { PatternActions } from "@design-studio/actions/pattern/index";

import type { Entries } from "../_core/handler.js";
import { handle as createPatternHandle } from "./create.js";
import {
  handle as deletePatternHandle,
  preview as deletePatternPreview,
} from "./delete.js";
import { handle as getPatternHandle } from "./get.js";
import { handle as importPatternHandle } from "./import.js";
import { handle as insertPatternHandle } from "./insert.js";
import { handle as inspectPatternHandle } from "./inspect.js";
import { handle as listPatternHandle } from "./list.js";

const PatternEntries = {
  createPattern: { handle: createPatternHandle },
  deletePattern: { handle: deletePatternHandle, preview: deletePatternPreview },
  getPattern: { handle: getPatternHandle },
  importPattern: { handle: importPatternHandle },
  insertPattern: { handle: insertPatternHandle },
  inspectPattern: { handle: inspectPatternHandle },
  listPattern: { handle: listPatternHandle },
} satisfies Entries<typeof PatternActions>;

export { PatternEntries };
