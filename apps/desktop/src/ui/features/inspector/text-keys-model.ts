import type { SelectionContext } from "@design-studio/contracts";

import type { TextKeyId } from "../../../shared/text-keys.js";
import { textKeysCopy } from "./copy.js";
import type { StyleValues } from "./css-value-model.js";
import { toAlign } from "./field-model.js";
import { toMultiBlockReason } from "./mixed-values-model.js";
import { hasTextLine, toToggledLine } from "./rows-model.js";

type TextProp = "font-weight" | "text-align" | "text-decoration-line";

interface TextChange {
  readonly prop: TextProp;
  readonly target: SelectionContext;
  readonly value: string;
}

type AlignKeyId = Extract<TextKeyId, `text-align-${string}`>;

type LineKeyId = Extract<TextKeyId, "text-strike" | "text-underline">;

const BOLD_MIN = 600;
const BOLD = "700";
const NORMAL = "400";
const NORMAL_WEIGHT = 400;
const LINE_PROP = "text-decoration-line";

const ALIGN_VALUES: Record<AlignKeyId, string> = {
  "text-align-center": "center",
  "text-align-justify": "justify",
  "text-align-left": "left",
  "text-align-right": "right",
};

const LINE_VALUES: Record<LineKeyId, string> = {
  "text-strike": "line-through",
  "text-underline": "underline",
};

const INLINE_TAGS: ReadonlySet<string> = new Set([
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "br",
  "cite",
  "code",
  "data",
  "del",
  "dfn",
  "em",
  "font",
  "i",
  "img",
  "ins",
  "kbd",
  "label",
  "mark",
  "q",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "svg",
  "time",
  "u",
  "var",
  "wbr",
]);

const SVG_BODY = /<svg[\s>][\s\S]*?<\/svg>/giu;

const CHILD_TAG = /<(?<tag>[a-z][\w-]*)/giu;

const toInnerHtml = (outer: string): string =>
  outer.slice(outer.indexOf(">") + 1).replaceAll(SVG_BODY, "");

const hasBlockChild = (target: SelectionContext): boolean =>
  [...toInnerHtml(target.outerHTML).matchAll(CHILD_TAG)].some(
    (match) => !INLINE_TAGS.has((match.groups?.["tag"] ?? "").toLowerCase())
  );

const hasText = (target: SelectionContext): boolean =>
  target.text.trim() !== "";

const isTextLayer = (target: SelectionContext): boolean =>
  hasText(target) && !hasBlockChild(target);

const toTextLayers = (
  selection: readonly SelectionContext[]
): SelectionContext[] => selection.filter((target) => isTextLayer(target));

const toTextBlock = (selection: readonly SelectionContext[]): string | null => {
  const layers = toTextLayers(selection);

  if (layers.length === 0 && selection.some((target) => hasText(target))) {
    return textKeysCopy.notTextLayer;
  }

  if (layers.length === 0) {
    return textKeysCopy.noText;
  }

  if (layers.length > 1) {
    return toMultiBlockReason(layers);
  }

  if (layers[0]?.source) {
    return null;
  }

  return textKeysCopy.noSource;
};

const toWeight = (target: SelectionContext): number =>
  Math.trunc(Number(target.styles["font-weight"] ?? "")) || NORMAL_WEIGHT;

const toLineValue = (target: SelectionContext): string =>
  target.styles[LINE_PROP] ?? "none";

const toBoldChanges = (layers: readonly SelectionContext[]): TextChange[] => {
  let value = BOLD;

  if (layers.every((target) => toWeight(target) >= BOLD_MIN)) {
    value = NORMAL;
  }

  return layers.flatMap((target): TextChange[] => {
    if (String(toWeight(target)) === value) {
      return [];
    }

    return [{ prop: "font-weight", target, value }];
  });
};

const toLineChanges = (
  layers: readonly SelectionContext[],
  line: string
): TextChange[] => {
  const isEveryOn = layers.every((target) =>
    hasTextLine(toLineValue(target), line)
  );

  return layers.flatMap((target): TextChange[] => {
    const current = toLineValue(target);

    if (hasTextLine(current, line) !== isEveryOn) {
      return [];
    }

    const value = toToggledLine(current, line);

    return [{ prop: LINE_PROP, target, value }];
  });
};

const toAlignChanges = (
  layers: readonly SelectionContext[],
  value: string
): TextChange[] =>
  layers.flatMap((target): TextChange[] => {
    if (toAlign(target.styles["text-align"] ?? "") === value) {
      return [];
    }

    return [{ prop: "text-align", target, value }];
  });

const isAlignKey = (id: TextKeyId): id is AlignKeyId =>
  Object.hasOwn(ALIGN_VALUES, id);

const isLineKey = (id: TextKeyId): id is LineKeyId =>
  Object.hasOwn(LINE_VALUES, id);

const toTextChanges = (
  selection: readonly SelectionContext[],
  id: TextKeyId
): TextChange[] => {
  const layers = toTextLayers(selection);

  if (isAlignKey(id)) {
    return toAlignChanges(layers, ALIGN_VALUES[id]);
  }

  if (isLineKey(id)) {
    return toLineChanges(layers, LINE_VALUES[id]);
  }

  return toBoldChanges(layers);
};

const toChangeStyle = (change: TextChange): Partial<StyleValues> => ({
  [change.prop]: change.value,
});

const toChangeBack = (change: TextChange): Partial<StyleValues> => ({
  [change.prop]: change.target.styles[change.prop] ?? "",
});

export { toChangeBack, toChangeStyle, toTextBlock, toTextChanges };

export type { TextChange };
