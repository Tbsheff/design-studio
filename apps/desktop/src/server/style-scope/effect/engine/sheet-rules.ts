import type { EffectItem } from "@design-studio/actions/effect/schema";
import { EFFECT_CLASS_PREFIX } from "@design-studio/contracts/layer-effect";

import type { EffectDeclaration } from "./compile.js";
import { HEX_RADIX } from "./numbers.js";

interface RawRule {
  readonly className: string;
  readonly end: number;
  readonly json: string;
  readonly start: number;
}

interface RulePayload {
  readonly effects: readonly EffectItem[];
  readonly name: string | null;
}

const RULE_PATTERN =
  /\/\* ds-effect (?<json>\{[^\n]*\}) \*\/\n\.(?<name>fx-[\w-]+)\{[^}]*\}\n?/gu;

const HASH_MULTIPLIER = 31;

const HASH_MODULUS = 4_294_967_291;

const HASH_WIDTH = 8;

const fromSheetText = (text: string): RawRule[] =>
  [...text.matchAll(RULE_PATTERN)].map((match) => ({
    className: match.groups?.["name"] ?? "",
    end: (match.index ?? 0) + match[0].length,
    json: match.groups?.["json"] ?? "",
    start: match.index ?? 0,
  }));

const toRuleText = (
  className: string,
  payload: RulePayload,
  declarations: readonly EffectDeclaration[]
): string => {
  const body = declarations
    .map((entry) => `${entry.property}:${entry.value}`)
    .join(";");

  return `/* ds-effect ${JSON.stringify(payload)} */\n.${className}{${body}}\n`;
};

const toNamedClass = (name: string): string => `${EFFECT_CLASS_PREFIX}${name}`;

const toLayerClass = (effects: readonly EffectItem[]): string => {
  let hash = 7;

  for (const char of JSON.stringify(effects)) {
    hash = (hash * HASH_MULTIPLIER + (char.codePointAt(0) ?? 0)) % HASH_MODULUS;
  }

  return `${EFFECT_CLASS_PREFIX}${hash.toString(HEX_RADIX).padStart(HASH_WIDTH, "0")}`;
};

const toSheetWithRule = (
  text: string,
  existing: RawRule | null,
  ruleText: string
): string => {
  if (existing !== null) {
    return text.slice(0, existing.start) + ruleText + text.slice(existing.end);
  }

  if (text === "") {
    return ruleText;
  }

  let base = text;

  if (!base.endsWith("\n")) {
    base += "\n";
  }

  return `${base}\n${ruleText}`;
};

const toSheetWithoutRule = (text: string, existing: RawRule): string =>
  text.slice(0, existing.start) + text.slice(existing.end);

export {
  fromSheetText,
  toLayerClass,
  toNamedClass,
  toRuleText,
  toSheetWithRule,
  toSheetWithoutRule,
};

export type { RawRule, RulePayload };
