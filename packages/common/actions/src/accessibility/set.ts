import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  AccessibilityChangeSchema,
  AccessibilityElementSchema,
  AccessibilitySetFields,
  AccessibilityTargetFields,
} from "./schema.js";

const setAccessibility = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_accessibility",
    set: "core",
    short:
      "Set aria-label, role, alt or tabIndex on one layer as one version; on a kit component it sets the prop at the call site.",
  },
  confirm: "none",
  description:
    "Set accessibility attributes on one layer in one version: ariaLabel, role, alt and tabIndex. Pass only the values to change; null removes a value. When the layer is rendered by a kit component (such as <Button> from packages/ui), the prop is set at the call site of that component, not in the kit file. alt works only on images and component call sites. To fix low contrast, use the fix from inspect_accessibility with replace_style. One version and one undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/accessibility",
  },
  id: "accessibility.set",
  input: Schema.Struct({
    ...AccessibilityTargetFields,
    ...AccessibilitySetFields,
    target: AccessibilityElementSchema,
  }),
  invalidates: ["accessibility.inspect"],
  mcp: { name: "set_accessibility" },
  needs: "project.update",
  output: AccessibilityChangeSchema,
  scope: "project",
});

export { setAccessibility };
