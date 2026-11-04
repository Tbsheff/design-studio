import {
  MAX_MOCK_BODY,
  MAX_RULE_DELAY_MS,
} from "@design-studio/contracts/frame-state";

import type { ObservedCall, Transformer } from "./calls.js";
import { createRng, toValue } from "./synth.js";
import type { JsonValue, SynthContext, SynthMode } from "./synth.js";

type ScenarioKind = "empty" | "error" | "filled" | "loading" | "long";

interface ScenarioRule {
  readonly body: JsonValue;
  readonly delayMs: number | null;
  readonly method: string;
  readonly path: string;
  readonly status: number;
}

interface ScenarioDraft {
  readonly id: string;
  readonly kind: ScenarioKind;
  readonly name: string;
  readonly rules: readonly ScenarioRule[];
}

const SCENARIO_KINDS: readonly ScenarioKind[] = [
  "filled",
  "empty",
  "long",
  "error",
  "loading",
];

const SCENARIO_NAMES: Readonly<Record<ScenarioKind, string>> = {
  empty: "Empty",
  error: "Error",
  filled: "Filled",
  loading: "Loading",
  long: "Long content",
};

const ERROR_TEXT = "Design Studio scenario: this call failed on purpose.";

const ERROR_STATUS = 500;

const OK_STATUS = 200;

const SCALE_HALF = 0.5;
const SCALE_QUARTER = 0.25;
const SCALE_TENTH = 0.1;
const SCALE_TINY = 0.02;

const SCALES: readonly number[] = [
  1,
  SCALE_HALF,
  SCALE_QUARTER,
  SCALE_TENTH,
  SCALE_TINY,
];

const toScenarioId = (frameId: string, kind: ScenarioKind): string =>
  `${frameId}-${kind}`;

const toSynthMode = (kind: ScenarioKind): SynthMode => {
  if (kind === "empty") {
    return "empty";
  }

  if (kind === "long") {
    return "long";
  }

  return "filled";
};

const toSizedValue = (
  call: ObservedCall,
  mode: SynthMode
): JsonValue | null => {
  const { structure } = call;

  if (structure === null) {
    return null;
  }

  for (const scale of SCALES) {
    const next = createRng(`${call.method} ${call.path} ${mode}`);
    const context: SynthContext = { mode, next, scale };

    const value = toValue(structure, "", 0, context);

    if (JSON.stringify(value).length <= MAX_MOCK_BODY) {
      return value;
    }
  }

  return null;
};

const toEnvelope = (value: JsonValue, transformer: Transformer): JsonValue => {
  if (transformer === "superjson") {
    return { result: { data: { json: value } } };
  }

  return { result: { data: value } };
};

const toErrorBody = (call: ObservedCall): JsonValue => {
  if (call.procedure !== null) {
    return { message: ERROR_TEXT };
  }

  return { error: ERROR_TEXT, message: ERROR_TEXT };
};

const toErrorRule = (call: ObservedCall): ScenarioRule => ({
  body: toErrorBody(call),
  delayMs: null,
  method: call.method,
  path: call.path,
  status: ERROR_STATUS,
});

const toDelay = (kind: ScenarioKind): number | null => {
  if (kind === "loading") {
    return MAX_RULE_DELAY_MS;
  }

  return null;
};

const toDataRule = (call: ObservedCall, kind: ScenarioKind): ScenarioRule[] => {
  const value = toSizedValue(call, toSynthMode(kind));

  if (value === null) {
    return [];
  }

  let body: JsonValue = value;

  if (call.procedure !== null) {
    body = toEnvelope(value, call.transformer);
  }

  return [
    {
      body,
      delayMs: toDelay(kind),
      method: call.method,
      path: call.path,
      status: OK_STATUS,
    },
  ];
};

const toScenarioRules = (
  calls: readonly ObservedCall[],
  kind: ScenarioKind
): ScenarioRule[] =>
  calls.flatMap((call) => {
    if (kind === "error") {
      return [toErrorRule(call)];
    }

    return toDataRule(call, kind);
  });

const toScenarioDraft = (
  calls: readonly ObservedCall[],
  frameId: string,
  kind: ScenarioKind
): ScenarioDraft => {
  const id = toScenarioId(frameId, kind);
  const name = SCENARIO_NAMES[kind];
  const rules = toScenarioRules(calls, kind);

  return { id, kind, name, rules };
};

const toScenarioDrafts = (
  calls: readonly ObservedCall[],
  frameId: string
): ScenarioDraft[] =>
  SCENARIO_KINDS.map((kind) => toScenarioDraft(calls, frameId, kind));

export { SCENARIO_KINDS, toScenarioDrafts, toScenarioId };

export type { ScenarioDraft, ScenarioKind, ScenarioRule };
