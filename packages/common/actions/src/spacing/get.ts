import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementSourceFields } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  SpacingBoxSchema,
  SpacingComputedFields,
  SpacingLimitSchema,
  SpacingTargetFields,
} from "./schema.js";

const getSpacing = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_spacing",
    set: "core",
    short:
      "Read the padding, margin and gap of one element, with the spacing scale.",
  },
  confirm: "none",
  description:
    "Read the box model of one element: padding and margin per side, row and column gap, each with css, px, token and class, the rect, and the spacing scale of the project. Read only. The limit caps the scale list.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/spacing",
  },
  id: "spacing.get",
  input: Schema.Struct({
    ...SpacingTargetFields,
    ...ElementSourceFields,
    ...SpacingComputedFields,
    limit: SpacingLimitSchema,
  }),
  invalidates: [],
  mcp: { name: "get_spacing" },
  needs: "project.read",
  output: SpacingBoxSchema,
  scope: "project",
});

export { getSpacing };
