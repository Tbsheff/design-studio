const NAMED_ENTITIES = {
  amp: "&",
  apos: "'",
  bull: "•",
  cent: "¢",
  check: "✓",
  copy: "©",
  cross: "✗",
  darr: "↓",
  deg: "°",
  divide: "÷",
  euro: "€",
  gt: ">",
  harr: "↔",
  hearts: "♥",
  hellip: "…",
  laquo: "«",
  larr: "←",
  ldquo: "“",
  lsaquo: "‹",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  middot: "·",
  minus: "−",
  nbsp: " ",
  ndash: "–",
  para: "¶",
  plusmn: "±",
  pound: "£",
  quot: '"',
  raquo: "»",
  rarr: "→",
  rdquo: "”",
  reg: "®",
  rsaquo: "›",
  rsquo: "’",
  sect: "§",
  star: "☆",
  starf: "★",
  times: "×",
  trade: "™",
  uarr: "↑",
  yen: "¥",
} satisfies Record<string, string>;

const ENTITY_MAP: ReadonlyMap<string, string> = new Map(
  Object.entries(NAMED_ENTITIES)
);

const MAX_CODE_POINT = 0x10_ff_ff;
const HEX_RADIX = 16;
const ENTITY_RE = /&(?<body>#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/giu;

const codePoint = (value: number): string => {
  if (Number.isInteger(value) && value > 0 && value <= MAX_CODE_POINT) {
    return String.fromCodePoint(value);
  }

  return "";
};

const numericValue = (body: string): number => {
  if (body[1] === "x" || body[1] === "X") {
    return Number.parseInt(body.slice(2), HEX_RADIX);
  }

  return Number(body.slice(1));
};

const decodeEntity = (whole: string, body: string): string => {
  if (body[0] !== "#") {
    return ENTITY_MAP.get(body) ?? ENTITY_MAP.get(body.toLowerCase()) ?? whole;
  }

  return codePoint(numericValue(body)) || whole;
};

const decodeEntities = (text: string): string =>
  text.replaceAll(ENTITY_RE, decodeEntity);

export { decodeEntities };
