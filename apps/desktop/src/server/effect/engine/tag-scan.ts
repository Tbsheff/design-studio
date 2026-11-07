interface TagLoc {
  readonly col: number;
  readonly line: number;
}

const TAG_MAX = 4000;

const QUOTES = new Set(["'", '"', "`"]);

const BRACE_STEP = new Map<string, number>([
  ["{", 1],
  ["}", -1],
]);

const toTagEnd = (text: string): number => {
  let depth = 0;
  let quote: string | null = null;

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);

    if (quote !== null) {
      if (char === quote) {
        quote = null;
      }
    } else if (QUOTES.has(char)) {
      quote = char;
    } else {
      depth += BRACE_STEP.get(char) ?? 0;

      if (char === ">" && depth === 0) {
        return index + 1;
      }
    }
  }

  return text.length;
};

const toOffset = (text: string, loc: TagLoc): number => {
  const lines = text.split("\n").slice(0, loc.line - 1);
  const before = lines.reduce((sum, line) => sum + line.length + 1, 0);

  return before + Math.max(0, loc.col - 1);
};

const toOpeningTag = (text: string, loc: TagLoc): string => {
  const start = toOffset(text, loc);
  const slice = text.slice(start, start + TAG_MAX);

  return slice.slice(0, toTagEnd(slice));
};

const CLASS_TOKEN = /(?<![\w-])fx-[\w-]+/gu;

const toEffectTokens = (tag: string): string[] => [
  ...new Set(tag.match(CLASS_TOKEN)),
];

export { toEffectTokens, toOpeningTag };

export type { TagLoc };
