import { Schema } from "effect";

const STATE_RUN_STATUSES = [
  "waiting",
  "running",
  "done",
  "skipped",
  "failed",
  "stopped",
] as const;

const StateRunStatusSchema = Schema.Literals(STATE_RUN_STATUSES);

const StateRunItemSchema = Schema.Struct({
  frameId: Schema.String,
  runId: Schema.NullOr(Schema.String),
  state: Schema.String,
  stateName: Schema.String,
  status: StateRunStatusSchema,
});

const StateRunSchema = Schema.Struct({
  items: Schema.Array(StateRunItemSchema),
  section: Schema.String,
  sequenceId: Schema.String,
});

type StateRunStatus = typeof StateRunStatusSchema.Type;

type StateRunItem = typeof StateRunItemSchema.Type;

type StateRun = typeof StateRunSchema.Type;

type StateRunWire = typeof StateRunSchema.Encoded;

export {
  STATE_RUN_STATUSES,
  StateRunItemSchema,
  StateRunSchema,
  StateRunStatusSchema,
};

export type { StateRun, StateRunItem, StateRunStatus, StateRunWire };
