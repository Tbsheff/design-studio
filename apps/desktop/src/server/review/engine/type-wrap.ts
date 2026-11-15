import { toEachHit } from "./type-facts.js";
import type { TypeFix, TypeHit, TypeSeverity, TypeText } from "./type-facts.js";

const HEADING_LEVEL_MAX = 4;

const HEADING_SIZE = 20;

const PARAGRAPH_LINES = 3;

const PARAGRAPH_CAP = 6;

const CONTROL_WORDS = 4;

const WRAP_CAP = 12;

const PARAGRAPH_TAGS = new Set(["li", "p"]);

const BALANCED = new Set(["balance", "pretty"]);

const BALANCE_FIX: TypeFix = {
  label: "Balance the lines",
  style: { "text-wrap": "balance" },
  tailwindClass: "text-balance",
};

const PRETTY_FIX: TypeFix = {
  label: "Avoid a 1-word last line",
  style: { "text-wrap": "pretty" },
  tailwindClass: "text-pretty",
};

const NOWRAP_FIX: TypeFix = {
  label: "Keep the label on 1 line",
  style: { "white-space": "nowrap" },
  tailwindClass: "whitespace-nowrap",
};

const isOrphan = (text: TypeText): boolean =>
  text.lines >= 2 && text.lastLineWords === 1;

const isHeadingText = (text: TypeText): boolean =>
  (text.level > 0 && text.level <= HEADING_LEVEL_MAX) ||
  (!text.isLabel && text.size >= HEADING_SIZE);

const isOrphanHeading = (text: TypeText): boolean =>
  isHeadingText(text) && isOrphan(text) && !BALANCED.has(text.textWrap);

const isParagraphText = (text: TypeText): boolean =>
  !isHeadingText(text) &&
  PARAGRAPH_TAGS.has(text.tag) &&
  text.lines >= PARAGRAPH_LINES;

const isOrphanParagraph = (text: TypeText): boolean =>
  isParagraphText(text) && isOrphan(text) && text.textWrap !== "pretty";

const isControlText = (text: TypeText): boolean =>
  text.isLabel && text.level === 0 && text.words <= CONTROL_WORDS;

const isWrappedControl = (text: TypeText): boolean =>
  isControlText(text) && text.lines >= 2 && text.whiteSpace !== "nowrap";

const toHeadingSeverity = (text: TypeText): TypeSeverity => {
  if (text.level === 1) {
    return "medium";
  }

  return "low";
};

const toHeadingHit = (text: TypeText): TypeHit => ({
  fix: BALANCE_FIX,
  hint: "Use text-wrap: balance (Tailwind text-balance) so the heading lines have about the same length.",
  message: `The last line of this heading has 1 word ("${text.lastWord}"). Balance the lines.`,
  selector: text.selector,
  severity: toHeadingSeverity(text),
});

const toParagraphHit = (text: TypeText): TypeHit => ({
  fix: PRETTY_FIX,
  hint: "Use text-wrap: pretty (Tailwind text-pretty) so the last line has more than 1 word.",
  message: `The last line of this paragraph has 1 word ("${text.lastWord}"). Use text-wrap: pretty.`,
  selector: text.selector,
  severity: "low",
});

const toControlName = (text: TypeText): string => {
  if (text.tag === "button" || text.tag === "a") {
    return "button";
  }

  return "label";
};

const toControlFix = (text: TypeText): TypeFix | null => {
  if (text.roomPx > 0 && text.roomPx >= text.extraPx) {
    return NOWRAP_FIX;
  }

  return null;
};

const toControlHint = (fix: TypeFix | null): string => {
  if (fix) {
    return "Use white-space: nowrap (Tailwind whitespace-nowrap). The row has room for the full label.";
  }

  return "Shorten the label or give it more room.";
};

const toControlHit = (text: TypeText): TypeHit => {
  const fix = toControlFix(text);

  return {
    fix,
    hint: toControlHint(fix),
    message: `This ${toControlName(text)} text wraps to ${text.lines} lines.`,
    selector: text.selector,
    severity: "medium",
  };
};

const toWrapHits = (texts: readonly TypeText[]): TypeHit[] => {
  const headings = toEachHit(
    texts,
    (text) => isOrphanHeading(text),
    (text) => toHeadingHit(text)
  );

  const paragraphs = toEachHit(
    texts,
    (text) => isOrphanParagraph(text),
    (text) => toParagraphHit(text)
  ).slice(0, PARAGRAPH_CAP);

  const controls = toEachHit(
    texts,
    (text) => isWrappedControl(text),
    (text) => toControlHit(text)
  );

  return [...controls, ...headings, ...paragraphs].slice(0, WRAP_CAP);
};

export { toWrapHits };
