import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  ComponentVariantCreateFields,
  ComponentVariantScopeFields,
  ComponentVariantTargetFields,
  ComponentVariantWrittenSchema,
} from "./schema.js";

const createComponentVariant = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_component_variant",
    set: "kit",
    short:
      "Add a value (or a new key) to the cva variants map of one kit component, with classes or a copy of a value; returns a preview.",
  },
  confirm: "none",
  description:
    "Add a value to the cva() variants map of one kit component, for example Button variant danger with its Tailwind classes. copyFrom starts from an existing value. newKey: true adds a new variant key with this value as its default. setDefault: true also sets defaultVariants. Only the cva() call changes; other code in the file stays the same. Refuses a component with no cva(). One version and one undo step. Returns the new value list and a PNG preview of the new value.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/component-variant/create",
  },
  id: "component-variant.create",
  input: Schema.Struct({
    ...ComponentVariantScopeFields,
    ...ComponentVariantTargetFields,
    ...ComponentVariantCreateFields,
  }),
  invalidates: ["version.list"],
  mcp: { name: "create_component_variant" },
  needs: "project.update",
  output: ComponentVariantWrittenSchema,
  scope: "project",
});

export { createComponentVariant };
