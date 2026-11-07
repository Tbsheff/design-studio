import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  EffectCreateFields,
  EffectStyleSavedSchema,
  EffectTargetFields,
} from "./schema.js";

const createEffect = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_effect",
    set: "core",
    short: "Save or update a named effect style that many layers can share.",
  },
  confirm: "none",
  description:
    "Save a named effect style as a stylesheet class. The name is a kebab-case word. If the style exists, its effects are replaced, and every layer that uses the style changes. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/effect-style",
  },
  id: "effect.create",
  input: Schema.Struct({
    ...EffectTargetFields,
    ...EffectCreateFields,
  }),
  invalidates: ["effect.get", "effect.list"],
  mcp: { name: "create_effect" },
  needs: "project.update",
  output: EffectStyleSavedSchema,
  scope: "project",
});

export { createEffect };
