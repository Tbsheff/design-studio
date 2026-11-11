import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  ProjectPrototypeCreatedSchema,
  ProjectPrototypeFields,
} from "./schema.js";

const createPrototypeProject = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_prototype_project",
    set: "app",
    short:
      "Create a linked HTML prototype of this app in the studio folder, with the app tokens. Use it when the user asks for an HTML prototype or mockup.",
  },
  confirm: "none",
  description:
    "Create an HTML prototype for an attached app. The prototype is a new HTML project in the Design Studio projects folder, under prototypes and the app name. It gets a tokens.css file with the app's CSS variables and fonts, and the app's DESIGN.md. It never changes the app repo.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/prototypes" },
  id: "project.createPrototype",
  input: Schema.Struct({
    ...ProjectPrototypeFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["project.list"],
  mcp: { name: "create_prototype_project" },
  needs: "project.create",
  output: ProjectPrototypeCreatedSchema,
  scope: "project",
});

export { createPrototypeProject };
