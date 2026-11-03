import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { RunIdSchema } from "../_core/ids.js";
import {
  AckSchema,
  AlwaysSchema,
  NoteSchema,
  RequestIdSchema,
} from "./schema.js";

const setPermissionRun = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Answer one open permission request of an active run. Fails when the request is not open.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/runs/:runId/permissions/:requestId" },
  id: "run.setPermission",
  input: Schema.Struct({
    allow: Schema.Boolean,
    always: Schema.optionalKey(AlwaysSchema),
    note: Schema.optionalKey(NoteSchema),
    requestId: RequestIdSchema,
    runId: RunIdSchema,
  }),
  invalidates: ["run.get"],
  mcp: { off: "run-control" },
  needs: "project.update",
  output: AckSchema,
  scope: "org",
});

export { setPermissionRun };
