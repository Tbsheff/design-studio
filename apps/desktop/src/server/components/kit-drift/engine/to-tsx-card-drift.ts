import { toClassTokens } from "./class-names.js";
import { isPillStyled } from "./to-badge-drift.js";
import { SIGNAL_COUNT, toTokenSignals } from "./to-card-drift.js";
import type { RawElement } from "./types.js";

type TsxLookTag = "badge" | "card";

interface TsxLookInput {
  readonly code: string;
  readonly elements: readonly RawElement[];
  readonly hasBadge: boolean;
  readonly hasCard: boolean;
}

interface TsxLookFind {
  readonly column: number;
  readonly line: number;
  readonly tag: TsxLookTag;
}

const CARD_TAGS: ReadonlySet<string> = new Set([
  "article",
  "div",
  "li",
  "section",
]);

const BADGE_TAGS: ReadonlySet<string> = new Set(["div", "span"]);

const LOOK_TAGS: ReadonlySet<string> = new Set([...CARD_TAGS, ...BADGE_TAGS]);

const TAG_OPEN = /<[A-Za-z]/gu;
const MAX_BADGE_TAGS = 2;
const MAX_BADGE_TEXT = 40;
const PILL_TOKEN = "rounded-full";

const toStaticTokens = (element: RawElement): string[] | null => {
  const found =
    element.attributes.find((attribute) => attribute.name === "className") ??
    null;

  if (found === null || found.kind !== "string") {
    return null;
  }

  return toClassTokens(found.text);
};

const isCardTokens = (tokens: readonly string[]): boolean =>
  new Set(toTokenSignals(tokens)).size === SIGNAL_COUNT;

const toTextOutsideTags = (text: string): string => {
  let isInTag = false;
  let outside = "";

  for (const char of text) {
    const isMark = char === "<" || char === ">";

    if (!isMark && !isInTag) {
      outside += char;
    }

    if (isMark) {
      isInTag = char === "<";
    }
  }

  return outside;
};

const isShortElement = (code: string, element: RawElement): boolean => {
  const text = code.slice(element.elementStart, element.elementEnd);
  const opens = [...text.matchAll(TAG_OPEN)].length;
  const inner = toTextOutsideTags(text).trim();

  return opens <= MAX_BADGE_TAGS && inner.length <= MAX_BADGE_TEXT;
};

const isBadgeElement = (
  input: TsxLookInput,
  element: RawElement,
  tokens: readonly string[]
): boolean =>
  input.hasBadge &&
  BADGE_TAGS.has(element.tag) &&
  isPillStyled({ declarations: new Map(), tokens }) &&
  isShortElement(input.code, element);

const isCardElement = (
  input: TsxLookInput,
  element: RawElement,
  tokens: readonly string[]
): boolean =>
  input.hasCard &&
  CARD_TAGS.has(element.tag) &&
  !tokens.includes(PILL_TOKEN) &&
  isCardTokens(tokens);

const toLookTag = (
  input: TsxLookInput,
  element: RawElement
): TsxLookTag | null => {
  const tokens = toStaticTokens(element);

  if (tokens === null) {
    return null;
  }

  if (isCardElement(input, element, tokens)) {
    return "card";
  }

  if (isBadgeElement(input, element, tokens)) {
    return "badge";
  }

  return null;
};

const toTsxCardDrift = (input: TsxLookInput): TsxLookFind[] =>
  input.elements.flatMap((element) => {
    const tag = toLookTag(input, element);

    if (tag === null) {
      return [];
    }

    return [{ column: element.column, line: element.line, tag }];
  });

export { LOOK_TAGS, toTsxCardDrift };

export type { TsxLookFind, TsxLookInput, TsxLookTag };
