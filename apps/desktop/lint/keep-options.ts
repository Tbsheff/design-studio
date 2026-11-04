import type { OxlintOverride } from "oxlint";

import { decisions } from "./decisions.ts";
import { presetRules } from "./presets.ts";

type LintRules = NonNullable<OxlintOverride["rules"]>;

type RuleLevel = LintRules[string];

const BASE_RULES = { ...presetRules, ...decisions.rules };

const optionsOf = (rule: string): readonly unknown[] => {
  const value = BASE_RULES[rule] ?? BASE_RULES[rule.replace(/^eslint\//u, "")];

  if (Array.isArray(value)) {
    return value.slice(1);
  }

  return [];
};

const DEFAULT_LIMITS = new Set(["sonarjs/max-lines-per-function"]);

const toLevel = (rule: string, level: RuleLevel): RuleLevel => {
  if (level !== "warn" || DEFAULT_LIMITS.has(rule)) {
    return level;
  }

  const options = optionsOf(rule);

  if (options.length === 0) {
    return level;
  }

  return ["warn", ...options];
};

const toRules = (rules: LintRules): LintRules =>
  Object.fromEntries(
    Object.entries(rules).map(([rule, level]) => [rule, toLevel(rule, level)])
  );

const toKeptOptions = (override: OxlintOverride): OxlintOverride => ({
  ...override,
  rules: toRules(override.rules ?? {}),
});

export { toKeptOptions };
