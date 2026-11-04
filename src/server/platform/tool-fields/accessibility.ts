import { z } from "zod";

import {
  ACCESSIBILITY_LABEL_MAX,
  ACCESSIBILITY_ROLES,
  TAB_INDEX_MAX,
  TAB_INDEX_MIN,
} from "../../../shared/accessibility.js";

const inspectAccessibilityFields = {
  includePassing: z
    .boolean()
    .optional()
    .describe("Also list the contrast pairs that pass. Default false."),
};

const text = z
  .string()
  .trim()
  .max(ACCESSIBILITY_LABEL_MAX)
  .nullable()
  .optional();

const setAccessibilityFields = {
  alt: text.describe(
    'Alt text of an image. "" marks a decorative image. null removes it.'
  ),
  ariaLabel: z
    .string()
    .trim()
    .min(1)
    .max(ACCESSIBILITY_LABEL_MAX)
    .nullable()
    .optional()
    .describe('aria-label, for example "Close dialog". null removes it.'),
  role: z
    .enum(ACCESSIBILITY_ROLES)
    .nullable()
    .optional()
    .describe("ARIA role, for example button. null removes it."),
  tabIndex: z
    .number()
    .int()
    .min(TAB_INDEX_MIN)
    .max(TAB_INDEX_MAX)
    .nullable()
    .optional()
    .describe(
      "tabIndex: 0 puts the layer in the tab order, -1 takes it out. null removes it."
    ),
};

export { inspectAccessibilityFields, setAccessibilityFields };
