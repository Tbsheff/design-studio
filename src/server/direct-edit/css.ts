interface Declaration {
  prop: string;
  value: string;
  raw: string | null;
}

interface ScanState {
  quote: string | null;
  depth: number;
}

function skipComment(text: string, index: number): number {
  const end = text.indexOf('*/', index + 2);
  return end === -1 ? text.length : end + 1;
}

function stepQuoted(state: ScanState, char: string): number {
  if (char === '\\') return 1;
  if (char === state.quote) state.quote = null;
  return 0;
}

function stepPlain(state: ScanState, char: string): void {
  if (char === '"' || char === "'") state.quote = char;
  else if (char === '(') state.depth += 1;
  else if (char === ')') state.depth = Math.max(0, state.depth - 1);
}

function isSplitPoint(state: ScanState, char: string, separator: string): boolean {
  return state.quote === null && state.depth === 0 && char === separator;
}

function splitTopLevel(text: string, separator: string, limit = Number.POSITIVE_INFINITY): string[] {
  const parts: string[] = [];
  const state: ScanState = { quote: null, depth: 0 };
  let start = 0;
  let index = 0;
  while (index < text.length) {
    const char = text[index] ?? '';
    if (state.quote !== null) {
      index += stepQuoted(state, char);
    } else if (char === '/' && text[index + 1] === '*') {
      index = skipComment(text, index);
    } else if (isSplitPoint(state, char, separator) && parts.length < limit) {
      parts.push(text.slice(start, index));
      start = index + 1;
    } else {
      stepPlain(state, char);
    }
    index += 1;
  }
  parts.push(text.slice(start));
  return parts;
}

function normalizeProp(prop: string): string {
  const trimmed = prop.trim();
  return trimmed.startsWith('--') ? trimmed : trimmed.toLowerCase();
}

export function parseDeclarations(styleText: string): Declaration[] {
  const declarations: Declaration[] = [];
  for (const chunk of splitTopLevel(styleText, ';')) {
    const trimmed = chunk.trim();
    if (trimmed === '') continue;
    const [prop = '', value] = splitTopLevel(trimmed, ':', 1);
    if (value === undefined || prop.trim() === '') {
      declarations.push({ prop: '', value: '', raw: trimmed });
      continue;
    }
    declarations.push({ prop: normalizeProp(prop), value: value.trim(), raw: null });
  }
  return declarations;
}

export function applyDeclarationChanges(declarations: Declaration[], changes: Record<string, string | null>): Declaration[] {
  let next = [...declarations];
  for (const [rawProp, value] of Object.entries(changes)) {
    const prop = normalizeProp(rawProp);
    const matches = (declaration: Declaration): boolean => declaration.raw === null && declaration.prop === prop;
    const first = next.findIndex(matches);
    if (value === null) {
      next = next.filter((declaration) => !matches(declaration));
    } else if (first === -1) {
      next.push({ prop, value, raw: null });
    } else {
      next = next.filter((declaration, index) => index <= first || !matches(declaration));
      next[first] = { prop, value, raw: null };
    }
  }
  return next;
}

export function serializeDeclarations(declarations: Declaration[]): string {
  return declarations
    .map((declaration) => (declaration.raw === null ? `${declaration.prop}: ${declaration.value};` : `${declaration.raw};`))
    .join(' ');
}
