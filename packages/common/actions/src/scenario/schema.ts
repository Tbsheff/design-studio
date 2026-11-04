import { Schema } from "effect";

const MAX_SCENARIO_CALLS = 40;

const MAX_CONSOLE_ERRORS = 5;

const ScenarioKindSchema = Schema.Literals([
  "filled",
  "empty",
  "long",
  "error",
  "loading",
]);

const ScenarioCallSchema = Schema.Struct({
  method: Schema.String,
  path: Schema.String,
});

const ScenarioSchema = Schema.Struct({
  calls: Schema.Array(ScenarioCallSchema).check(
    Schema.isMaxLength(MAX_SCENARIO_CALLS)
  ),
  frameId: Schema.String,
  id: Schema.String,
  kind: ScenarioKindSchema,
  name: Schema.String,
});

const ScenarioSetSchema = Schema.Struct({
  frameId: Schema.String,
  route: Schema.String,
  scenarios: Schema.Array(ScenarioSchema),
  seenCalls: Schema.Int,
  unseen: Schema.Array(Schema.String),
});

const ScenarioAppliedSchema = Schema.Struct({
  frameId: Schema.String,
  scenarioId: Schema.NullOr(Schema.String),
  stateId: Schema.NullOr(Schema.String),
});

const ScenarioResultSchema = Schema.Struct({
  clippedCount: Schema.Int,
  consoleErrors: Schema.Array(Schema.String).check(
    Schema.isMaxLength(MAX_CONSOLE_ERRORS)
  ),
  kind: ScenarioKindSchema,
  overflowCount: Schema.Int,
  scenarioId: Schema.String,
});

const ScenarioRunSchema = Schema.Struct({
  contactSheet: Schema.String,
  frameId: Schema.String,
  results: Schema.Array(ScenarioResultSchema),
  unseen: Schema.Array(Schema.String),
});

export {
  MAX_CONSOLE_ERRORS,
  MAX_SCENARIO_CALLS,
  ScenarioAppliedSchema,
  ScenarioCallSchema,
  ScenarioKindSchema,
  ScenarioResultSchema,
  ScenarioRunSchema,
  ScenarioSchema,
  ScenarioSetSchema,
};
