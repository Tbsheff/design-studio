import { z } from "zod";

import {
  ACCESSIBILITY_LABEL_MAX,
  ACCESSIBILITY_ROLES,
  TAB_INDEX_MAX,
  TAB_INDEX_MIN,
} from "./deps.js";
import type { AccessibilityChanges } from "./deps.js";

interface AccessibilityFieldsInput {
  readonly alt?: string | null | undefined;
  readonly ariaLabel?: string | null | undefined;
  readonly role?: (typeof ACCESSIBILITY_ROLES)[number] | null | undefined;
  readonly tabIndex?: number | null | undefined;
}

const INSPECT_ACCESSIBILITY_DESCRIPTION =
  "Check the accessibility of one canvas frame, or of one layer in it, on the live page. It returns the role and accessible name of the layer and where the name comes from (aria-labelledby, aria-label, alt, label, title, text, placeholder or none), the tab order, the focusable elements with no name, the images with no alt, and the text and background contrast pairs with the WCAG ratio and the need (4.5:1, or 3:1 for large text). Each low pair names the nearest project token that passes and a fix to send to replace_style. Pass includePassing to list the pairs that pass too. Read only.";

const SET_ACCESSIBILITY_DESCRIPTION =
  "Set accessibility attributes on one layer in one version: ariaLabel, role, alt and tabIndex. Pass only the values to change; null removes a value. When the layer is rendered by a kit component (such as <Button> from packages/ui), the prop is set at the call site of that component, not in the kit file. alt works only on images and component call sites. To fix low contrast, use the fix from inspect_accessibility with replace_style. One version and one undo step.";

const NO_CHANGE = "Pass at least one of ariaLabel, role, alt or tabIndex.";

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

const FIELDS = ["alt", "ariaLabel", "role", "tabIndex"] as const;

const toAccessibilityChanges = (
  input: AccessibilityFieldsInput
): AccessibilityChanges | null => {
  const changes: Record<string, number | string | null> = {};

  for (const field of FIELDS) {
    if (field in input) {
      changes[field] = input[field] ?? null;
    }
  }

  if (Object.keys(changes).length === 0) {
    return null;
  }

  return changes as AccessibilityChanges;
};

export {
  INSPECT_ACCESSIBILITY_DESCRIPTION,
  inspectAccessibilityFields,
  NO_CHANGE as NO_ACCESSIBILITY_CHANGE,
  SET_ACCESSIBILITY_DESCRIPTION,
  setAccessibilityFields,
  toAccessibilityChanges,
};

export type { AccessibilityFieldsInput };
