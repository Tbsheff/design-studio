import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  ComponentVariantPreviewFields,
  ComponentVariantPreviewSchema,
  ComponentVariantScopeFields,
} from "./schema.js";

const getComponentVariant = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Render a PNG preview of one component with one variant value set. Returns the PNG as base64 with its content hash, or a reason when no preview can be made. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/component-variant/preview",
  },
  id: "component-variant.get",
  input: Schema.Struct({
    ...ComponentVariantScopeFields,
    ...ComponentVariantPreviewFields,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: ComponentVariantPreviewSchema,
  scope: "project",
});

export { getComponentVariant };
