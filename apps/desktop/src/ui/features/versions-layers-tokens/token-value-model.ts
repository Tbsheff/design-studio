const OKLCH_OPEN = "oklch(";
const OKLCH_CLOSE = ")";
const OKLCH_ANYWHERE = /oklch\([^)]*\)/giu;
const SPACES = /\s+/u;
const OKLCH_PARTS = 3;
const PERCENT_SCALE = 100;
const CHROMA_DIGITS = 3;

const toLightness = (raw: string): string | null => {
  if (raw.endsWith("%")) {
    const amount = Number(raw.slice(0, -1));

    if (Number.isNaN(amount)) {
      return null;
    }

    return `${Math.round(amount)}%`;
  }

  const amount = Number(raw);

  if (Number.isNaN(amount)) {
    return null;
  }

  return `${Math.round(amount * PERCENT_SCALE)}%`;
};

const toChroma = (raw: string): string | null => {
  const amount = Number(raw);

  if (Number.isNaN(amount)) {
    return null;
  }

  const rounded = Number(amount.toFixed(CHROMA_DIGITS));

  if (rounded === 0) {
    return "0";
  }

  return String(rounded).replace(/^0\./u, ".");
};

const toHue = (raw: string): string | null => {
  const amount = Number(raw.replace(/deg$/iu, ""));

  if (Number.isNaN(amount)) {
    return null;
  }

  return String(Math.round(amount));
};

const toAlpha = (raw: string | null): string => {
  if (raw === null || raw.trim() === "") {
    return "";
  }

  return ` / ${raw.trim()}`;
};

const toShortColor = (value: string): string => {
  const trimmed = value.trim();

  const isOklch =
    trimmed.toLowerCase().startsWith(OKLCH_OPEN) &&
    trimmed.endsWith(OKLCH_CLOSE);

  if (!isOklch) {
    return value;
  }

  const inner = trimmed.slice(OKLCH_OPEN.length, -OKLCH_CLOSE.length);
  const [main = "", alpha = null] = inner.split("/");
  const parts = main.trim().split(SPACES);

  if (parts.length !== OKLCH_PARTS) {
    return value;
  }

  const lightness = toLightness(parts[0] ?? "");
  const chroma = toChroma(parts[1] ?? "");
  const hue = toHue(parts[2] ?? "");

  if (lightness === null || chroma === null || hue === null) {
    return value;
  }

  return `oklch(${lightness} ${chroma} ${hue}${toAlpha(alpha)})`;
};

const toShortValue = (value: string): string =>
  value.replaceAll(OKLCH_ANYWHERE, (found) => toShortColor(found));

export { toShortColor, toShortValue };
