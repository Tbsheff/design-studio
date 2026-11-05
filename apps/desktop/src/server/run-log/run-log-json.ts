import type {
  RunSentRecord,
  RunSummary,
  StudioEvent,
} from "@design-studio/contracts";
import { Schema } from "effect";

const EventEnvelope = Schema.Struct({
  projectId: Schema.String,
  seq: Schema.Number,
  ts: Schema.Number,
  type: Schema.String,
});

const SentEnvelope = Schema.Struct({
  directionId: Schema.String,
  projectId: Schema.String,
  runId: Schema.String,
  ts: Schema.Number,
  type: Schema.Literal("run.sent"),
});

const SummaryEnvelope = Schema.Struct({
  directionId: Schema.String,
  id: Schema.String,
  projectId: Schema.String,
  startedAt: Schema.Number,
  status: Schema.String,
});

const hasEventEnvelope = Schema.is(EventEnvelope);
const hasSentEnvelope = Schema.is(SentEnvelope);
const hasSummaryEnvelope = Schema.is(SummaryEnvelope);

const isStudioEvent = (value: unknown): value is StudioEvent =>
  hasEventEnvelope(value);

const isRunSentRecord = (value: unknown): value is RunSentRecord =>
  hasSentEnvelope(value);

const isRunSummary = (value: unknown): value is RunSummary =>
  hasSummaryEnvelope(value);

const isRunLogRecord = (value: unknown): value is RunSentRecord | StudioEvent =>
  isRunSentRecord(value) || isStudioEvent(value);

export { isRunLogRecord, isRunSummary };
