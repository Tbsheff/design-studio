import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { AnimationRefFields, AnimationRemovedSchema } from "./schema.js";

const deleteAnimation = defineAction({
  access: "destructive",
  agent: {
    lean: true,
    name: "delete_animation",
    set: "core",
    short:
      "Delete a keyframe animation and remove its CSS block from the project.",
  },
  confirm: "user",
  description:
    "Delete one saved keyframe animation: removes its timeline file and its CSS block from the project. The card names the animation and the files that change. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/animation/:animationId",
  },
  id: "animation.delete",
  input: Schema.Struct({
    ...AnimationRefFields,
  }),
  invalidates: ["animation.list", "animation.get"],
  mcp: { name: "delete_animation" },
  needs: "project.update",
  output: AnimationRemovedSchema,
  scope: "project",
});

export { deleteAnimation };
