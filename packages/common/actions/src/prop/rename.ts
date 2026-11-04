import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  PropChangeSchema,
  PropNameSchema,
  PropTargetFields,
} from "./schema.js";

const renameProp = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "rename_prop",
    set: "core",
    short: "Rename a component prop in the type, the body and every use site.",
  },
  confirm: "none",
  description:
    "Rename one prop of a React component in its type, its body and every use site in the repo. Refuses when a use site spreads props or cannot be edited. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/prop/rename",
  },
  id: "prop.rename",
  input: Schema.Struct({
    ...PropTargetFields,
    name: Schema.String,
    newName: PropNameSchema,
  }),
  invalidates: ["prop.list"],
  mcp: { name: "rename_prop" },
  needs: "project.update",
  output: PropChangeSchema,
  scope: "project",
});

export { renameProp };
