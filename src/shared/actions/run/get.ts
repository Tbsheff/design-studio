import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { RunIdSchema } from "../_core/ids.js";
import { RunDetailSchema } from "./schema.js";

const getRun = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Read one run by id. Returns its events, the messages sent to it and its summary. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/runs/:runId" },
  id: "run.get",
  input: Schema.Struct({
    runId: RunIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: RunDetailSchema,
  scope: "org",
});

export { getRun };
