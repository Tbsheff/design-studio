import { defineConfig } from "oxlint";
import type { OxlintConfig, OxlintOverride } from "oxlint";

import { BOUNDARY_OVERRIDES, LINT_IGNORES, TEST_OVERRIDES } from "./oxlint.config.ts";
import { decisionOverrides, decisions } from "./lint/decisions.ts";
import { dayOne } from "./lint/day-one.ts";
import { antiSlop, core, react } from "./lint/presets.ts";

const NATIVE = new Set(["import", "jsdoc", "jsx-a11y", "node", "oxc", "promise", "react", "react-perf", "typescript", "unicorn", "vitest"]);

type RuleMap = NonNullable<OxlintOverride["rules"]>;

const isNative = (key: string): boolean => !key.includes("/") || NATIVE.has(key.slice(0, key.lastIndexOf("/")));

type RuleEntry = [string, RuleMap[string]];

const isNativeEntry = (entry: [string, unknown]): entry is RuleEntry => isNative(entry[0]);

const nativeRules = (rules: typeof decisions.rules = {}): RuleMap => Object.fromEntries(Object.entries(rules).filter((entry) => isNativeEntry(entry)));

const nativeOverride = ({ jsPlugins: _drop, ...entry }: OxlintOverride): OxlintOverride[] => {
  const rules = nativeRules(entry.rules);

  if (Object.keys(rules).length === 0 && !("plugins" in entry)) {
    return [];
  }

  return [{ ...entry, rules }];
};

const nativeOverrides = (entries: OxlintOverride[] = []): OxlintOverride[] => entries.flatMap((entry) => nativeOverride(entry));

const nativePreset = ({ jsPlugins: _drop, settings: _settings, ...preset }: OxlintConfig): OxlintConfig => ({
  ...preset,
  overrides: nativeOverrides(preset.overrides),
  rules: nativeRules(preset.rules),
});

export default defineConfig({
  env: core.env,
  extends: [core, react, antiSlop].map((preset) => nativePreset(preset)),
  ignorePatterns: LINT_IGNORES,
  options: { typeAware: false },
  overrides: nativeOverrides([...BOUNDARY_OVERRIDES, ...decisionOverrides, ...TEST_OVERRIDES, ...dayOne]),
  rules: nativeRules(decisions.rules),
});
