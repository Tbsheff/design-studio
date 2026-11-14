import type { EffectItem } from "@design-studio/actions/effect/schema";
import { EFFECT_COLOR_PATTERN } from "@design-studio/contracts/layer-effect";

type ShadowItem = Extract<
  EffectItem,
  { readonly kind: "drop-shadow" | "inner-shadow" }
>;

const LENGTH_COUNT = 4;

const LENGTH_RE = /^-?[\d.]+(?:px)?$/u;

const INSET = "inset";

const toSplitTopLevel = (text: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === "(") {
      depth += 1;
    }

    if (char === ")") {
      depth -= 1;
    }

    if (char === "," && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(text.slice(start));

  return parts.flatMap((part) => {
    const trimmed = part.trim();

    if (trimmed === "") {
      return [];
    }

    return [trimmed];
  });
};

const toSplitWords = (text: string): string[] => {
  const words: string[] = [];
  let depth = 0;
  let word = "";

  for (const char of text) {
    if (char === "(") {
      depth += 1;
    }

    if (char === ")") {
      depth -= 1;
    }

    if (/\s/u.test(char) && depth === 0) {
      words.push(word);
      word = "";
    } else {
      word += char;
    }
  }

  words.push(word);

  return words.filter((entry) => entry !== "");
};

const toShadowItem = (text: string): ShadowItem | null => {
  const words = toSplitWords(text);
  let shadowKind: ShadowItem["kind"] = "drop-shadow";

  if (words[0] === INSET) {
    shadowKind = "inner-shadow";
    words.shift();
  }

  const lengths: number[] = [];
  const colors: string[] = [];

  for (const word of words) {
    if (LENGTH_RE.test(word)) {
      lengths.push(Number(word.replace("px", "")));
    } else {
      colors.push(word);
    }
  }

  if (lengths.length < 2 || !EFFECT_COLOR_PATTERN.test(colors.join(" "))) {
    return null;
  }

  const [x = 0, y = 0, radius = 0, size = 0] = lengths.slice(0, LENGTH_COUNT);

  return {
    blur: radius,
    color: colors.join(" "),
    isEnabled: true,
    kind: shadowKind,
    offsetX: x,
    offsetY: y,
    size: null,
    spread: size,
  };
};

export { toShadowItem, toSplitTopLevel };

export type { ShadowItem };
