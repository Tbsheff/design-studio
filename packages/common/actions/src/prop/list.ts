import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { PropSchema, PropTargetFields } from "./schema.js";

const listProp = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_prop",
    set: "core",
    short: "List the props of one component with kind, default and use count.",
  },
  confirm: "none",
  description:
    "List the props of one React component: name, kind (text, boolean, slot, instance or value), default and how many use sites in the repo set the prop. Reads source only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/d/:directionId/prop" },
  id: "prop.list",
  input: Schema.Struct({
    ...PageFields,
    ...PropTargetFields,
  }),
  invalidates: [],
  mcp: { name: "list_prop" },
  needs: "project.read",
  output: pageOf(PropSchema),
  scope: "project",
});

export { listProp };
