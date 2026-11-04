const REM_PX = 16;
const CALC_PARTS = 3;

const LENGTH_PATTERN = /^(?<amount>-?\d+(?:\.\d+)?)(?<unit>px|rem|em)$/iu;
const CALC_PATTERN = /^calc\((?<body>[^()]*)\)$/iu;

const unitPx = (unit: string): number => {
  if (unit.toLowerCase() === "px") {
    return 1;
  }

  return REM_PX;
};

const parseLength = (value: string): number | null => {
  const match = LENGTH_PATTERN.exec(value.trim());

  if (!match?.groups) {
    return null;
  }

  return (
    Number(match.groups["amount"] ?? "0") * unitPx(match.groups["unit"] ?? "px")
  );
};

const sumOf = (left: number, sign: string, right: number): number => {
  if (sign === "-") {
    return left - right;
  }

  return left + right;
};

const lengthPx = (value: string): number | null => {
  const direct = parseLength(value);

  if (direct !== null) {
    return direct;
  }

  const calc = CALC_PATTERN.exec(value.trim());
  const parts = (calc?.groups?.["body"] ?? "").trim().split(/\s+/u);

  if (parts.length !== CALC_PARTS) {
    return null;
  }

  const [first = "", sign = "", second = ""] = parts;
  const left = parseLength(first);
  const right = parseLength(second);

  if (left === null || right === null) {
    return null;
  }

  return sumOf(left, sign, right);
};

export { lengthPx };
