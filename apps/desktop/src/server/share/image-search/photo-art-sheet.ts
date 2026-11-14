import type { DarkForms } from "./photo-art-dark.js";
import { ART_ATTR } from "./photo-slots.js";

interface SlotArtRule {
  readonly darkSrc: string | null;
  readonly isImg: boolean;
  readonly key: string;
  readonly lightSrc: string;
}

const SHEET_TAG = "style";

const SHEET_OPEN = ["<", SHEET_TAG, " data-photo-art-sheet>"].join("");

const SHEET_CLOSE = ["</", SHEET_TAG, ">"].join("");

const HEAD_CLOSE = /<\/head\s*>/iu;

const BOX_LIGHT =
  "background-size: cover !important; background-position: center !important;";

const toKeySelector = (key: string): string => `[${ART_ATTR}="${key}"]`;

const toDarkDeclaration = (rule: SlotArtRule, src: string): string => {
  if (rule.isImg) {
    return `content: url("${src}");`;
  }

  return `background-image: url("${src}") !important;`;
};

const toDarkLines = (rule: SlotArtRule, forms: DarkForms): string[] => {
  if (rule.darkSrc === null) {
    return [];
  }

  const target = toKeySelector(rule.key);
  const body = toDarkDeclaration(rule, rule.darkSrc);
  const lines: string[] = [];

  if (forms.isClass) {
    lines.push(`.dark ${target}, [data-theme="dark"] ${target} { ${body} }`);
  }

  if (forms.isMedia) {
    lines.push(
      `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) ${target} { ${body} } }`
    );
  }

  return lines;
};

const toRuleLines = (rule: SlotArtRule, forms: DarkForms): string[] => {
  const dark = toDarkLines(rule, forms);

  if (rule.isImg) {
    return dark;
  }

  const light = `${toKeySelector(rule.key)} { background-image: url("${rule.lightSrc}") !important; ${BOX_LIGHT} }`;

  return [light, ...dark];
};

const toSheetText = (
  current: string,
  rules: readonly SlotArtRule[],
  forms: DarkForms
): string => {
  const keys = rules.map((rule) => toKeySelector(rule.key));

  const kept = current
    .split("\n")
    .filter(
      (line) => line.trim() !== "" && !keys.some((key) => line.includes(key))
    );

  const added = rules.flatMap((rule) => toRuleLines(rule, forms));

  return `${[...kept, ...added].join("\n")}\n`;
};

const toSheetRange = (
  code: string
): { readonly end: number; readonly start: number } | null => {
  const open = code.indexOf(SHEET_OPEN);

  if (open === -1) {
    return null;
  }

  const start = open + SHEET_OPEN.length;
  const end = code.indexOf(SHEET_CLOSE, start);

  if (end === -1) {
    return null;
  }

  return { end, start };
};

const toSheetedHtml = (
  code: string,
  rules: readonly SlotArtRule[],
  forms: DarkForms
): string => {
  if (rules.length === 0) {
    return code;
  }

  const range = toSheetRange(code);

  if (range !== null) {
    const current = code.slice(range.start, range.end);
    const text = toSheetText(current, rules, forms);

    return `${code.slice(0, range.start)}\n${text}${code.slice(range.end)}`;
  }

  const block = `${SHEET_OPEN}\n${toSheetText("", rules, forms)}${SHEET_CLOSE}\n`;
  const head = HEAD_CLOSE.exec(code);

  if (head === null) {
    return `${block}${code}`;
  }

  return `${code.slice(0, head.index)}${block}${code.slice(head.index)}`;
};

export { toSheetText, toSheetedHtml };

export type { SlotArtRule };
