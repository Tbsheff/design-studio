import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  ComponentVariantScopeFields,
  ComponentVariantTargetFields,
  ComponentVariantUpdateFields,
  ComponentVariantWrittenSchema,
} from "./schema.js";

const updateComponentVariant = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "update_component_variant",
    set: "kit",
    short:
      "Rename a cva variant value of one kit component, replace its classes, or make it the default; returns a preview.",
  },
  confirm: "none",
  description:
    "Rename a value of the cva() variants map of one kit component, or replace its Tailwind classes, or make it the default. A rename also changes defaultVariants and compoundVariants that name the value; uses of the old name in pages do not change. Only the cva() call changes. One version and one undo step. Returns the value list and a PNG preview of the value.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/component-variant/update",
  },
  id: "component-variant.update",
  input: Schema.Struct({
    ...ComponentVariantScopeFields,
    ...ComponentVariantTargetFields,
    ...ComponentVariantUpdateFields,
  }),
  invalidates: ["version.list"],
  mcp: { name: "update_component_variant" },
  needs: "project.update",
  output: ComponentVariantWrittenSchema,
  scope: "project",
});

export { updateComponentVariant };
