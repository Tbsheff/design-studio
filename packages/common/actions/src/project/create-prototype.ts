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
      "Create a linked HTML prototype of this app or folder in the studio folder, with its tokens. Use it when the user asks for a prototype, mockup or draft.",
  },
  confirm: "none",
  description:
    "Create an HTML prototype for a folder workspace or an attached app. The prototype is a new HTML project in the Design Studio projects folder, under prototypes and the folder name. It gets the folder's DESIGN.md, a folder-context.md file with its README and a short file list, and a tokens.css file when the folder has CSS variables or fonts. With routePath, it starts the app dev server, copies that route as the start page, and sets near values to the app tokens. It never changes the source folder.",
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
