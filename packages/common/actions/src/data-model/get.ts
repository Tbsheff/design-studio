import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  DataModelDetailSchema,
  DataModelFieldLimitSchema,
  DataModelRowsSchema,
  DataModelSeedSchema,
  DataModelVariantFieldSchema,
} from "./schema.js";

const getDataModel = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_data_model",
    set: "app",
    short:
      "Read one Prisma model of the attached app: fields, enums, relations and deterministic sample rows.",
  },
  confirm: "none",
  description:
    "Read one Prisma model of the attached app with its fields, enum values and relations. Returns deterministic synthetic rows that fit the fields, and a TypeScript text to paste. Reads no database and sends no real data. Same input gives the same rows.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/data-models/:model" },
  id: "data-model.get",
  input: Schema.Struct({
    limit: DataModelFieldLimitSchema,
    model: Schema.String,
    projectId: ProjectIdSchema,
    rows: DataModelRowsSchema,
    seed: DataModelSeedSchema,
    variant: DataModelVariantFieldSchema,
  }),
  invalidates: [],
  mcp: { name: "get_data_model" },
  needs: "project.read",
  output: DataModelDetailSchema,
  scope: "project",
});

export { getDataModel };
