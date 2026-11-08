import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { VisionFields, VisionReportSchema } from "./schema.js";

const runVisionAccessibility = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "run_vision_accessibility",
    set: "core",
    short:
      "Simulate color blindness and low vision on a frame. Lists text pairs that fail contrast after simulation and status colors that look alike.",
  },
  confirm: "none",
  description:
    "Render one canvas frame, or one layer in it, as a user with protanopia, deuteranopia, tritanopia, achromatopsia, blurred vision or reduced contrast would see it. It returns one screenshot per kind, the text and background pairs that pass WCAG for normal vision but fall under the need after simulation, the status colors that fall under a delta E of 10 from each other, and a contact sheet of the original and each kind.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/accessibility/vision",
  },
  id: "accessibility.runVision",
  input: Schema.Struct(VisionFields),
  invalidates: ["accessibility.inspect"],
  mcp: { name: "run_vision_accessibility" },
  needs: "project.update",
  output: VisionReportSchema,
  scope: "project",
});

export { runVisionAccessibility };
