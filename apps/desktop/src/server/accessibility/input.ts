import type { ACCESSIBILITY_ROLES, AccessibilityChanges } from "./deps.js";

interface AccessibilityFieldsInput {
  readonly alt?: string | null | undefined;
  readonly ariaLabel?: string | null | undefined;
  readonly role?: (typeof ACCESSIBILITY_ROLES)[number] | null | undefined;
  readonly tabIndex?: number | null | undefined;
}

const NO_CHANGE = "Pass at least one of ariaLabel, role, alt or tabIndex.";

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

export { NO_CHANGE as NO_ACCESSIBILITY_CHANGE, toAccessibilityChanges };

export type { AccessibilityFieldsInput };
