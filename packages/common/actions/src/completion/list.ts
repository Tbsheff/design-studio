import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { CompletionRecordSchema } from "./schema.js";

const listCompletion = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "list_completion",
    set: "core",
    short:
      "List the prototype AI call log with spent and cap in USD. Reads only.",
  },
  confirm: "none",
  description:
    "List the live model calls that prototype pages made in a project. Each record has the time, prompt start, cost, time in ms and source frame. The page also returns spentUsd this month and capUsd. Reads only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/completions" },
  id: "completion.list",
  input: Schema.Struct({
    ...PageFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_completion" },
  needs: "project.read",
  output: pageOf(CompletionRecordSchema, {
    capUsd: Schema.Number,
    isEnabled: Schema.Boolean,
    spentUsd: Schema.Number,
  }),
  scope: "project",
});

export { listCompletion };
