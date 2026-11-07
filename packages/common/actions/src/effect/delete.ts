import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  EffectNameFields,
  EffectStyleDeletedSchema,
  EffectTargetFields,
} from "./schema.js";

const deleteEffect = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "delete_effect",
    set: "core",
    short: "Delete a named effect style after the user approves.",
  },
  confirm: "user",
  description:
    "Delete a named effect style from the project stylesheet after the user approves. Layers that use the style keep the class name but lose the look. The approval card names the style and the count of layers that use it.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/effect-style/:name",
  },
  id: "effect.delete",
  input: Schema.Struct({
    ...EffectTargetFields,
    ...EffectNameFields,
  }),
  invalidates: ["effect.get", "effect.list"],
  mcp: { name: "delete_effect" },
  needs: "project.update",
  output: EffectStyleDeletedSchema,
  scope: "project",
});

export { deleteEffect };
