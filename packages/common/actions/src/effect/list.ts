import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { EffectStyleSchema, EffectTargetFields } from "./schema.js";

const listEffect = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_effect",
    set: "core",
    short: "List the saved effect styles of the project.",
  },
  confirm: "none",
  description:
    "List the saved effect styles of the project with name, class name and effects. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/effect-style",
  },
  id: "effect.list",
  input: Schema.Struct({
    ...PageFields,
    ...EffectTargetFields,
  }),
  invalidates: [],
  mcp: { name: "list_effect" },
  needs: "project.read",
  output: pageOf(EffectStyleSchema),
  scope: "project",
});

export { listEffect };
