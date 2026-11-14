import { Effect, Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, RunIdSchema } from "../_core/ids.js";
import { RunDetailSchema } from "./schema.js";

const WAIT_MAX_SECONDS = 120;

const WaitSecondsField = Schema.Int.check(
  Schema.isBetween({ maximum: WAIT_MAX_SECONDS, minimum: 0 })
)
  .annotate({
    description:
      "How many seconds to wait while the run is running, from 0 to 120. The call returns when the run ends or the time ends. Default 0, which returns at once.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(0)));

const AfterEventField = Schema.NullOr(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
)
  .annotate({
    description:
      "Return only the events after this index. Pass the eventCount of the last get_run call. Default null, which returns every event.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const getRun = defineAction({
  access: "read",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Read one run by id. Returns its status at the top level, events, the messages sent to it and its summary. Pass waitSeconds (up to 120) to wait until the run ends, and afterEvent with the last eventCount to get only new events. Read only.",
  errors: [NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/runs/:runId" },
  id: "run.get",
  input: Schema.Struct({
    afterEvent: AfterEventField,
    projectId: ProjectIdSchema,
    runId: RunIdSchema,
    waitSeconds: WaitSecondsField,
  }),
  invalidates: [],
  mcp: { name: "get_run" },
  needs: "project.read",
  output: RunDetailSchema,
  scope: "project",
});

export { getRun };
