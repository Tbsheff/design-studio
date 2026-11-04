import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { TokenAppliedSchema, TokenApplyFields } from "./schema.js";

const applyToken = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "apply_token",
    set: "kit",
    short:
      "Find hard-coded colors, spacing, radii and font sizes near a design token and rewrite them to the token, as one version.",
  },
  confirm: "none",
  description:
    "Find hard-coded values that sit near an existing design token and rewrite them to the token. kinds is any of color, spacing, radius and font (default all). Colors match by nearest delta E. Spacing, radius and font sizes match by nearest step within 1 px. It finds hex, rgb and px values in CSS, style props and Tailwind arbitrary classes. page limits the sweep to one source file, layer to one element. dryRun (default true) returns the changes and the values with no match and writes nothing. dryRun false writes one version, Apply tokens. select takes change ids from a dry run.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tokens/apply",
  },
  id: "token.apply",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...TokenApplyFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["version.list"],
  mcp: { name: "apply_token" },
  needs: "project.update",
  output: TokenAppliedSchema,
  scope: "project",
});

export { applyToken };
