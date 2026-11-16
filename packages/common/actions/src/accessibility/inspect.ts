import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  AccessibilityInspectFields,
  AccessibilityReportSchema,
  AccessibilityTargetFields,
} from "./schema.js";

const inspectAccessibility = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "inspect_accessibility",
    set: "core",
    short:
      "Read only. List the role and name of a layer, the tab order, unnamed controls, images with no alt and low contrast pairs with a token that passes.",
  },
  confirm: "none",
  description:
    "Check the accessibility of one canvas frame, or of one layer in it, on the live page. It returns the role and accessible name of the layer and where the name comes from, the tab order, the focusable elements with no name, the images with no alt, and the text and background contrast pairs with the WCAG ratio and the need (4.5:1, or 3:1 for large text). Each low pair names the nearest project token that passes and a fix to send to replace_style. Pass includePassing to list the pairs that pass too. Pass colorScheme dark to check the dark theme. The limit caps each list. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/accessibility",
  },
  id: "accessibility.inspect",
  input: Schema.Struct({
    ...AccessibilityTargetFields,
    ...AccessibilityInspectFields,
  }),
  invalidates: [],
  mcp: { name: "inspect_accessibility" },
  needs: "project.read",
  output: AccessibilityReportSchema,
  scope: "project",
});

export { inspectAccessibility };
