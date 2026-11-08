import { formatNumber, parseNumber } from "./css-values.js";

interface Shadow {
  readonly x: string;
  readonly y: string;
  readonly blur: string;
  readonly spread: string;
  readonly color: string;
  readonly isInset: boolean;
}

const NEW_SHADOW: Shadow = {
  blur: "12px",
  color: "rgb(0 0 0 / 0.12)",
  isInset: false,
  spread: "0",
  x: "0",
  y: "4px",
};

const LENGTH_RE = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)?$/iu;
const BLUR_RE = /^blur\((?<amount>[^()]*)\)$/iu;
const MIN_LENGTHS = 2;
const MAX_LENGTHS = 4;

const isSeparator = (char: string, separator: "," | " "): boolean => {
  if (separator === " ") {
    return /\s/u.test(char);
  }

  return char === separator;
};

const listTopLevel = (value: string, separator: "," | " "): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of value) {
    if (char === "(") {
      depth += 1;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
    }

    if (depth === 0 && isSeparator(char, separator)) {
      if (current.trim()) {
        parts.push(current.trim());
      }

      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
};

const toTidyLength = (raw: string): string => {
  const parsed = parseNumber(raw);

  if (!parsed) {
    return raw;
  }

  if (parsed.value === 0) {
    return "0";
  }

  return formatNumber(parsed.value, parsed.unit || "px");
};

const toShadow = (raw: string): Shadow | null => {
  const lengths: string[] = [];
  const colors: string[] = [];
  let isInset = false;

  for (const token of listTopLevel(raw, " ")) {
    if (token.toLowerCase() === "inset") {
      isInset = true;
    } else if (LENGTH_RE.test(token)) {
      lengths.push(toTidyLength(token));
    } else {
      colors.push(token);
    }
  }

  if (
    lengths.length < MIN_LENGTHS ||
    lengths.length > MAX_LENGTHS ||
    colors.length > 1
  ) {
    return null;
  }

  const color = colors[0] ?? "";
  const [positionX = "0", positionY = "0", blur = "0", spread = "0"] = lengths;

  return {
    blur,
    color,
    isInset,
    spread,
    x: positionX,
    y: positionY,
  };
};

const toShadows = (value: string): Shadow[] | null => {
  const text = value.trim();

  if (text === "" || text.toLowerCase() === "none") {
    return [];
  }

  const list: Shadow[] = [];

  for (const part of listTopLevel(text, ",")) {
    const shadow = toShadow(part);

    if (!shadow) {
      return null;
    }

    list.push(shadow);
  }

  return list;
};

const toShadowText = (shadow: Shadow): string => {
  const parts: string[] = [];

  if (shadow.isInset) {
    parts.push("inset");
  }

  parts.push(
    toTidyLength(shadow.x || "0"),
    toTidyLength(shadow.y || "0"),
    toTidyLength(shadow.blur || "0"),
    toTidyLength(shadow.spread || "0"),
    shadow.color.trim()
  );

  return parts.filter(Boolean).join(" ");
};

const toShadowsText = (list: Shadow[]): string =>
  list.map((shadow) => toShadowText(shadow)).join(", ");

const toBlur = (filter: string): string => {
  for (const part of listTopLevel(filter, " ")) {
    const match = BLUR_RE.exec(part);

    if (match) {
      return toTidyLength((match.groups?.amount ?? "").trim());
    }
  }

  return "";
};

const toBlurSource = (filter: string): string => {
  if (filter.trim().toLowerCase() === "none") {
    return "";
  }

  return filter;
};

const isBlurKept = (blur: string): boolean => {
  const amount = parseNumber(blur);

  return blur.trim() !== "" && !(amount && amount.value === 0);
};

const toWithBlur = (filter: string, blur: string): string => {
  const others = listTopLevel(toBlurSource(filter), " ").filter(
    (part) => !BLUR_RE.test(part)
  );

  if (isBlurKept(blur)) {
    others.push(`blur(${blur.trim()})`);
  }

  return others.join(" ");
};

export {
  NEW_SHADOW,
  listTopLevel,
  toShadows,
  toShadowsText,
  toBlur,
  toWithBlur,
};

export type { Shadow };
