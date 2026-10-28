const ROOT_PX = 16;

type Token = { kind: 'num'; value: number; unit: string } | { kind: 'op'; value: string };

function tokenize(text: string): Token[] | null {
  const tokens: Token[] = [];
  const pattern = /\s*(?:(-?(?:\d+\.?\d*|\.\d+))(px|rem|em|%)?|(infinity)|(calc\()|([-+*/()]))/gy;
  let index = 0;
  while (index < text.length) {
    pattern.lastIndex = index;
    const match = pattern.exec(text);
    if (!match || match[0] === '') return /^\s*$/.test(text.slice(index)) ? tokens : null;
    index = pattern.lastIndex;
    if (match[1] !== undefined) tokens.push({ kind: 'num', value: Number(match[1]), unit: match[2] ?? '' });
    else if (match[3] !== undefined) tokens.push({ kind: 'num', value: Number.POSITIVE_INFINITY, unit: '' });
    else if (match[4] !== undefined) tokens.push({ kind: 'op', value: '(' });
    else if (match[5] !== undefined) tokens.push({ kind: 'op', value: match[5] });
  }
  return tokens;
}

interface Quantity {
  px: number;
  length: boolean;
}

function toQuantity(token: Extract<Token, { kind: 'num' }>): Quantity | null {
  if (token.unit === 'px') return { px: token.value, length: true };
  if (token.unit === 'rem' || token.unit === 'em') return { px: token.value * ROOT_PX, length: true };
  if (token.unit === '') return { px: token.value, length: false };
  return null;
}

function evaluate(tokens: Token[]): Quantity | null {
  let index = 0;
  const peek = () => tokens[index];
  const primary = (): Quantity | null => {
    const token = peek();
    if (!token) return null;
    index += 1;
    if (token.kind === 'num') return toQuantity(token);
    if (token.value === '(') {
      const inner = sum();
      const close = peek();
      if (!inner || close?.kind !== 'op' || close.value !== ')') return null;
      index += 1;
      return inner;
    }
    if (token.value === '-') {
      const inner = primary();
      return inner ? { px: -inner.px, length: inner.length } : null;
    }
    return null;
  };
  const product = (): Quantity | null => {
    let left = primary();
    while (left) {
      const token = peek();
      if (token?.kind !== 'op' || (token.value !== '*' && token.value !== '/')) break;
      index += 1;
      const right = primary();
      if (!right) return null;
      if (token.value === '*') left = { px: left.px * right.px, length: left.length || right.length };
      else if (right.length || right.px === 0) return null;
      else left = { px: left.px / right.px, length: left.length };
    }
    return left;
  };
  const sum = (): Quantity | null => {
    let left = product();
    while (left) {
      const token = peek();
      if (token?.kind !== 'op' || (token.value !== '+' && token.value !== '-')) break;
      index += 1;
      const right = product();
      if (!right) return null;
      left = { px: token.value === '+' ? left.px + right.px : left.px - right.px, length: left.length || right.length };
    }
    return left;
  };
  const result = sum();
  return result && index === tokens.length ? result : null;
}

export function lengthToPx(raw: string): number | null {
  const text = raw.trim().toLowerCase();
  if (text === '0') return 0;
  const tokens = tokenize(text);
  if (!tokens || tokens.length === 0) return null;
  const result = evaluate(tokens);
  if (!result || !Number.isFinite(result.px) && result.px !== Number.POSITIVE_INFINITY) return null;
  if (!result.length && result.px !== 0 && result.px !== Number.POSITIVE_INFINITY) return null;
  return result.px;
}

export function plainNumber(raw: string): number | null {
  const text = raw.trim();
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(text)) return Number(text);
  const tokens = tokenize(text.toLowerCase());
  if (!tokens) return null;
  const result = evaluate(tokens);
  return result && !result.length && Number.isFinite(result.px) ? result.px : null;
}

export function percent(raw: string): number | null {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))%$/.exec(raw.trim());
  return match ? Number(match[1]) : null;
}

export function emValue(raw: string): number | null {
  const text = raw.trim().toLowerCase();
  if (text === '0' || text === 'normal') return 0;
  const match = /^(-?(?:\d+\.?\d*|\.\d+))em$/.exec(text);
  return match ? Number(match[1]) : null;
}
