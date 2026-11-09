import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { TokenClassListFields, TokenClassSchema } from "./schema.js";

const listClassesToken = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "list_classes_token",
    set: "core",
    short:
      "List Tailwind classes that map to project tokens with token name, value and use count. Pass query as a class prefix.",
  },
  confirm: "none",
  description:
    "List the Tailwind classes of a direction that map to a design token, such as bg-primary or rounded-lg. Each item has the class, the token name, the resolved value and the use count. Pass query to list only classes that start with it. Items sort by use count.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/tokens/classes",
  },
  id: "token.listClasses",
  input: Schema.Struct({
    ...PageFields,
    ...TokenClassListFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_classes_token" },
  needs: "project.read",
  output: pageOf(TokenClassSchema),
  scope: "project",
});

export { listClassesToken };
