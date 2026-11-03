import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { RunIdSchema } from "../_core/ids.js";
import { AckSchema, QueueItemsSchema } from "./schema.js";

const setQueueRun = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Replace the queue of messages that wait for one active run. Fails when the run has finished.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PUT", path: "/api/runs/:runId/queue" },
  id: "run.setQueue",
  input: Schema.Struct({
    items: QueueItemsSchema,
    runId: RunIdSchema,
  }),
  invalidates: ["run.get"],
  mcp: { off: "run-control" },
  needs: "project.update",
  output: AckSchema,
  scope: "org",
});

export { setQueueRun };
