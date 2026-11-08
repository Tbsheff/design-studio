const NUMBER_RE =
  /^(?<value>-?(?:\d+(?:\.\d+)?|\.\d+))\s*(?<unit>px|rem|em|%)?$/iu;

const ROUND_FACTOR = 100;

interface ParsedNumber {
  readonly unit: string;
  readonly value: number;
}

const parseNumber = (raw: string): ParsedNumber | null => {
  const groups = NUMBER_RE.exec(raw.trim())?.groups;

  if (!groups) {
    return null;
  }

  return {
    unit: (groups["unit"] ?? "").toLowerCase(),
    value: Number(groups["value"]),
  };
};

const formatNumber = (value: number, unit: string): string =>
  `${Math.round(value * ROUND_FACTOR) / ROUND_FACTOR}${unit}`;

export { formatNumber, parseNumber };

export type { ParsedNumber };
