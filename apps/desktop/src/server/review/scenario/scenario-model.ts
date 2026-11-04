import type {
  ScenarioSchema,
  ScenarioSetSchema,
} from "@design-studio/actions/scenario/schema";
import { MAX_MOCK_RULES } from "@design-studio/contracts/frame-state";
import type { MockRule } from "@design-studio/contracts/frame-state";

import { toScenarioDrafts } from "./engine/index.js";
import type { ScenarioDraft, ScenarioRule } from "./engine/index.js";
import type { SavedScenarios } from "./scenario-saved.js";

type Scenario = typeof ScenarioSchema.Type;

type ScenarioSet = typeof ScenarioSetSchema.Type;

const UNSEEN_LIMITS: readonly string[] = [
  "Not seen: data that server components fetch while the page renders on the server.",
  "Not seen: server-side tRPC calls (createCaller, direct database reads) and server actions.",
  "Not seen: calls the page makes after the recording ended, for example on a click or a scroll.",
  "Not seen: streamed tRPC responses (jsonl). They have no structure here and cannot be mocked.",
];

const toDrafts = (saved: SavedScenarios): ScenarioDraft[] =>
  toScenarioDrafts(saved.calls, saved.frameId);

const toScenario = (draft: ScenarioDraft, frameId: string): Scenario => {
  const { id, kind, name } = draft;

  const calls = draft.rules.map((rule) => ({
    method: rule.method,
    path: rule.path,
  }));

  return { calls, frameId, id, kind, name };
};

const toMockRule = (rule: ScenarioRule): MockRule => {
  const base: MockRule = {
    body: rule.body,
    method: rule.method,
    path: rule.path,
    status: rule.status,
  };

  if (rule.delayMs === null) {
    return base;
  }

  return { ...base, delayMs: rule.delayMs };
};

const toMockRules = (draft: ScenarioDraft): MockRule[] =>
  draft.rules.slice(0, MAX_MOCK_RULES).map((rule) => toMockRule(rule));

const toUnseen = (saved: SavedScenarios): string[] => {
  const notes: string[] = [];

  if (saved.seenCalls === 0) {
    notes.push(
      "No browser calls were recorded. This frame loads its data on the server, or the page needs a signed-in session."
    );
  }

  if (saved.isTruncated) {
    notes.push(
      `More than ${MAX_MOCK_RULES} distinct calls were seen. Only the first ${MAX_MOCK_RULES} are kept.`
    );
  }

  if (saved.opaqueCount > 0) {
    notes.push(
      `${saved.opaqueCount} recorded calls have no structure (error or non-JSON answers). They get an error rule only.`
    );
  }

  return [...notes, ...UNSEEN_LIMITS];
};

const toScenarioSet = (saved: SavedScenarios): ScenarioSet => ({
  frameId: saved.frameId,
  route: saved.route,
  scenarios: toDrafts(saved).map((draft) => toScenario(draft, saved.frameId)),
  seenCalls: saved.seenCalls,
  unseen: toUnseen(saved),
});

export { toDrafts, toMockRules, toScenario, toScenarioSet, toUnseen };

export type { Scenario, ScenarioSet };
