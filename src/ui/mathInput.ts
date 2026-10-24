import { formatNumber, parseNumber } from './cssValues';

type Token = { kind: 'num'; value: number; unit: string } | { kind: 'op'; op: string };

const TOKEN_RE = /\s*(?:(\d*\.?\d+)(px|rem|em|%)?|([-+*/()]))/iy;
const OPERATOR_RE = /[-+*/()]/;

function tokenize(raw: string): Token[] | null {
  const tokens: Token[] = [];
  TOKEN_RE.lastIndex = 0;
  let at = 0;
  while (at < raw.length) {
    if (raw.slice(at).trim() === '') break;
    TOKEN_RE.lastIndex = at;
    const match = TOKEN_RE.exec(raw);
    if (!match) return null;
    at = TOKEN_RE.lastIndex;
    if (match[1] !== undefined) tokens.push({ kind: 'num', value: Number(match[1]), unit: (match[2] ?? '').toLowerCase() });
    else if (match[3]) tokens.push({ kind: 'op', op: match[3] });
  }
  return tokens;
}

interface Evaluated {
  value: number;
  units: Set<string>;
}

function evaluateTokens(tokens: Token[]): Evaluated | null {
  let index = 0;
  const units = new Set<string>();
  const peek = (): Token | undefined => tokens[index];
  const isOp = (op: string): boolean => {
    const token = peek();
    return token?.kind === 'op' && token.op === op;
  };

  const primary = (): number | null => {
    const token = peek();
    if (!token) return null;
    if (token.kind === 'num') {
      index += 1;
      if (token.unit) units.add(token.unit);
      return token.value;
    }
    if (token.op === '-' || token.op === '+') {
      index += 1;
      const inner = primary();
      return inner === null ? null : token.op === '-' ? -inner : inner;
    }
    if (token.op !== '(') return null;
    index += 1;
    const inner = sum();
    if (inner === null || !isOp(')')) return null;
    index += 1;
    return inner;
  };

  const product = (): number | null => {
    let left = primary();
    while (left !== null && (isOp('*') || isOp('/'))) {
      const op = (peek() as { op: string }).op;
      index += 1;
      const right = primary();
      if (right === null) return null;
      if (op === '/' && right === 0) return null;
      left = op === '*' ? left * right : left / right;
    }
    return left;
  };

  const sum = (): number | null => {
    let left = product();
    while (left !== null && (isOp('+') || isOp('-'))) {
      const op = (peek() as { op: string }).op;
      index += 1;
      const right = product();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  const value = sum();
  if (value === null || index !== tokens.length || !Number.isFinite(value)) return null;
  return { value, units };
}

export function evaluateMath(raw: string): { value: number; unit: string } | null {
  const tokens = tokenize(raw);
  if (!tokens || tokens.length === 0) return null;
  const result = evaluateTokens(tokens);
  if (!result || result.units.size > 1) return null;
  return { value: result.value, unit: [...result.units][0] ?? '' };
}

const RELATIVE_RE = /^(\+=?|-=)/;

export function resolveNumberInput(raw: string, current: string, defaultUnit: string): string | null {
  const text = raw.trim();
  if (!OPERATOR_RE.test(text)) return null;
  const relative = RELATIVE_RE.exec(text)?.[0] ?? '';
  const result = evaluateMath(text.slice(relative.length));
  if (!result) return null;
  const base = parseNumber(current);
  const unit = result.unit || base?.unit || defaultUnit;
  if (!relative) return formatNumber(result.value, unit);
  if (base && result.unit && base.unit && base.unit !== result.unit) return null;
  const start = base?.value ?? 0;
  return formatNumber(relative === '-=' ? start - result.value : start + result.value, unit);
}
