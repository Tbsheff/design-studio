// @generated
import type { AccessibilityActions } from "@design-studio/actions/accessibility/index";

import type { Entries } from "../_core/handler.js";
import { handle as inspectAccessibilityHandle } from "./inspect.js";
import { handle as listReaderLinesAccessibilityHandle } from "./list-reader-lines.js";
import { handle as runVisionAccessibilityHandle } from "./run-vision.js";
import { handle as setAccessibilityHandle } from "./set.js";

const AccessibilityEntries = {
  inspectAccessibility: { handle: inspectAccessibilityHandle },
  listReaderLinesAccessibility: { handle: listReaderLinesAccessibilityHandle },
  runVisionAccessibility: { handle: runVisionAccessibilityHandle },
  setAccessibility: { handle: setAccessibilityHandle },
} satisfies Entries<typeof AccessibilityActions>;

export { AccessibilityEntries };
