import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { DataModelQuerySchema, DataModelSummarySchema } from "./schema.js";

const listDataModel = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "list_data_model",
    set: "app",
    short:
      "List the Prisma models and enums of the attached app: name, kind, file, field count and relations.",
  },
  confirm: "none",
  description:
    "List the Prisma models and enums of the attached app. Reads the Prisma schema files from the app folder and returns the name, kind, file, line, field count and relation names of each. Reads no database. Filter with query.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/data-models" },
  id: "data-model.list",
  input: Schema.Struct({
    ...PageFields,
    projectId: ProjectIdSchema,
    query: DataModelQuerySchema,
  }),
  invalidates: [],
  mcp: { name: "list_data_model" },
  needs: "project.read",
  output: pageOf(DataModelSummarySchema),
  scope: "project",
});

export { listDataModel };
