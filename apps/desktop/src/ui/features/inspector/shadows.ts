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

const LENGTH_RE = /^-?\d*\.?\d+(px|rem|em)?$/iu;
const BLUR_RE = /^blur\(\s*([^()]*)\s*\)$/iu;

const listTopLevel = (value: string, separator: "," | " "): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of value) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    }

    const splits =
      depth === 0 &&
      (separator === " " ? /\s/u.test(char) : char === separator);

    if (splits) {
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

  return parsed.value === 0
    ? "0"
    : formatNumber(parsed.value, parsed.unit || "px");
};

const toShadow = (raw: string): Shadow | null => {
  const lengths: string[] = [];
  const colors: string[] = [];
  let inset = false;

  for (const token of listTopLevel(raw, " ")) {
    if (token.toLowerCase() === "inset") {
      inset = true;
    } else if (LENGTH_RE.test(token)) {
      lengths.push(toTidyLength(token));
    } else {
      colors.push(token);
    }
  }

  if (lengths.length < 2 || lengths.length > 4 || colors.length > 1) {
    return null;
  }

  const [positionX = "0", positionY = "0", blur = "0", spread = "0"] = lengths;

  return {
    blur,
    color: colors[0] ?? "",
    isInset: inset,
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
  const parts = [
    shadow.isInset ? "inset" : "",
    toTidyLength(shadow.x || "0"),
    toTidyLength(shadow.y || "0"),
    toTidyLength(shadow.blur || "0"),
    toTidyLength(shadow.spread || "0"),
    shadow.color.trim(),
  ];

  return parts.filter(Boolean).join(" ");
};

const toShadowsText = (list: Shadow[]): string =>
  list.map(toShadowText).join(", ");

const toBlur = (filter: string): string => {
  for (const part of listTopLevel(filter, " ")) {
    const match = BLUR_RE.exec(part);

    if (match) {
      return toTidyLength(match[1] ?? "");
    }
  }

  return "";
};

const toWithBlur = (filter: string, blur: string): string => {
  const others = listTopLevel(
    filter.trim().toLowerCase() === "none" ? "" : filter,
    " "
  ).filter((part) => !BLUR_RE.test(part));

  const amount = parseNumber(blur);
  const keep = blur.trim() !== "" && !(amount && amount.value === 0);

  return [...others, ...(keep ? [`blur(${blur.trim()})`] : [])].join(" ");
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
