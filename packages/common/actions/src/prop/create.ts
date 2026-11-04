import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  PropChangeSchema,
  PropMakeKindSchema,
  PropNameSchema,
  PropTargetFields,
} from "./schema.js";

const createProp = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_prop",
    set: "core",
    short:
      "Make a layer of a component a prop (text, boolean, slot or instance). Use sites keep today's render.",
  },
  confirm: "none",
  description:
    "Turn one layer of a React component into a prop, written into the component source. Kind text moves the literal into a prop, boolean wraps the layer in a condition, slot replaces the layer with a node prop (or children), instance takes a component type prop. The default keeps every use site rendering as before. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/prop",
  },
  id: "prop.create",
  input: Schema.Struct({
    ...PropTargetFields,
    kind: PropMakeKindSchema,
    layerCol: Schema.Int,
    layerLine: Schema.Int,
    name: PropNameSchema,
  }),
  invalidates: ["prop.list"],
  mcp: { name: "create_prop" },
  needs: "project.update",
  output: PropChangeSchema,
  scope: "project",
});

export { createProp };
