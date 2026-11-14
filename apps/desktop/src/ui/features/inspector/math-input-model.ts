import { toNumberText, toParsedNumber } from "./css-value-model.js";

type Token =
  | { readonly kind: "num"; readonly value: number; readonly unit: string }
  | { readonly kind: "op"; readonly op: string };

interface MathResult {
  readonly value: number;
  readonly unit: string;
}

const TOKEN_RE =
  /\s*(?:(?<num>\d*\.?\d+)(?<unit>px|rem|em|%|deg)?|(?<op>[-+*/()]))/iuy;

const OPERATOR_RE = /[-+*/()]/u;
const RELATIVE_RE = /^(?:\+=?|-=)/u;

const toToken = (match: RegExpExecArray): Token | null => {
  const { num, op, unit } = match.groups ?? {};

  if (num) {
    return {
      kind: "num",
      unit: (unit ?? "").toLowerCase(),
      value: Number(num),
    };
  }

  if (op) {
    return { kind: "op", op };
  }

  return null;
};

const listTokens = (raw: string): Token[] | null => {
  const tokens: Token[] = [];
  let at = 0;

  while (raw.slice(at).trim() !== "") {
    TOKEN_RE.lastIndex = at;

    const match = TOKEN_RE.exec(raw);

    if (!match) {
      return null;
    }

    at = TOKEN_RE.lastIndex;

    const token = toToken(match);

    if (token) {
      tokens.push(token);
    }
  }

  return tokens;
};

const toOperated = (op: string, left: number, right: number): number => {
  if (op === "*") {
    return left * right;
  }

  if (op === "/") {
    return left / right;
  }

  if (op === "+") {
    return left + right;
  }

  return left - right;
};

class MathParser {
  public readonly units = new Set<string>();
  private position = 0;
  private readonly tokens: Token[];

  public constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public get isFinished(): boolean {
    return this.position === this.tokens.length;
  }

  private peek(): Token | null {
    return this.tokens[this.position] ?? null;
  }

  private isOp(op: string): boolean {
    const token = this.peek();

    return token?.kind === "op" && token.op === op;
  }

  private takeOp(): string {
    const token = this.peek();
    this.position += 1;

    if (token?.kind === "op") {
      return token.op;
    }

    return "";
  }

  private primary(): number | null {
    const token = this.peek();

    if (!token) {
      return null;
    }

    if (token.kind === "num") {
      this.position += 1;

      if (token.unit) {
        this.units.add(token.unit);
      }

      return token.value;
    }

    if (token.op === "-" || token.op === "+") {
      this.position += 1;

      const inner = this.primary();

      if (inner === null || token.op === "+") {
        return inner;
      }

      return -inner;
    }

    if (token.op !== "(") {
      return null;
    }

    this.position += 1;

    const inner = this.sum();

    if (inner === null || !this.isOp(")")) {
      return null;
    }

    this.position += 1;

    return inner;
  }

  private product(): number | null {
    let left = this.primary();

    while (left !== null && (this.isOp("*") || this.isOp("/"))) {
      const op = this.takeOp();
      const right = this.primary();

      if (right === null || (op === "/" && right === 0)) {
        return null;
      }

      left = toOperated(op, left, right);
    }

    return left;
  }

  public sum(): number | null {
    let left = this.product();

    while (left !== null && (this.isOp("+") || this.isOp("-"))) {
      const op = this.takeOp();
      const right = this.product();

      if (right === null) {
        return null;
      }

      left = toOperated(op, left, right);
    }

    return left;
  }
}

const runMath = (raw: string): MathResult | null => {
  const tokens = listTokens(raw);

  if (!tokens || tokens.length === 0) {
    return null;
  }

  const parser = new MathParser(tokens);
  const value = parser.sum();

  if (
    value === null ||
    !parser.isFinished ||
    !Number.isFinite(value) ||
    parser.units.size > 1
  ) {
    return null;
  }

  return { unit: [...parser.units][0] ?? "", value };
};

const toRelativeValue = (
  relative: string,
  start: number,
  value: number
): number => {
  if (relative === "-=") {
    return start - value;
  }

  return start + value;
};

const toNumberInput = (
  raw: string,
  current: string,
  defaultUnit: string
): string | null => {
  const text = raw.trim();

  if (!OPERATOR_RE.test(text)) {
    return null;
  }

  const relative = RELATIVE_RE.exec(text)?.[0] ?? "";
  const result = runMath(text.slice(relative.length));

  if (!result) {
    return null;
  }

  const base = toParsedNumber(current);
  const unit = result.unit || base?.unit || defaultUnit;

  if (!relative) {
    return toNumberText(result.value, unit);
  }

  if (base && result.unit && base.unit && base.unit !== result.unit) {
    return null;
  }

  return toNumberText(
    toRelativeValue(relative, base?.value ?? 0, result.value),
    unit
  );
};

export { runMath, toNumberInput };
