import type { ToolState } from "./tool-chips-model.js";
import { toRowClass, toVerbClass } from "./tool-item-model.js";

const TOOL_STATES: readonly ToolState[] = [
  "denied",
  "done",
  "error",
  "pending",
  "stopped",
];

const MUTED = "text-muted-foreground";

const STATE_TONE = new Map<string, string>([
  ["denied", MUTED],
  ["done", MUTED],
  ["error", "text-destructive"],
  ["pending", "text-primary"],
  ["stopped", MUTED],
]);

const toVariantKey = (state: ToolState, isSkill: boolean): string =>
  `${state}|${isSkill}`;

const toVariantClasses = (
  toClass: (state: ToolState, isSkill: boolean) => string
): ReadonlyMap<string, string> =>
  new Map(
    TOOL_STATES.flatMap((state) => [
      [toVariantKey(state, false), toClass(state, false)] as const,
      [toVariantKey(state, true), toClass(state, true)] as const,
    ])
  );

const ROW_CLASSES = toVariantClasses(toRowClass);
const VERB_CLASSES = toVariantClasses(toVerbClass);

export { ROW_CLASSES, STATE_TONE, VERB_CLASSES, toVariantKey };
