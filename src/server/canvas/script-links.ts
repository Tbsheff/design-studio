export interface ScriptTargets {
  href: Map<string, string>;
  click: Map<string, string>;
  submit: Map<string, string>;
  onAttr(code: string | null): string | null;
}

const NAME = '[A-Za-z_$][\\w$]*';
const LOOKUP = `document\\s*\\.\\s*(?:getElementById|querySelector)\\(\\s*['"][^'"]+['"]\\s*\\)`;
const RECV = `(${LOOKUP}|${NAME})`;
const QUOTED = '([\'"`])([^\'"`$]*)';
const LOCATION_RES = [new RegExp(`\\blocation(?:\\s*\\.\\s*href)?\\s*=(?!=)\\s*${QUOTED}`, 'g'), new RegExp(`\\blocation\\s*\\.\\s*(?:assign|replace)\\(\\s*${QUOTED}`, 'g')];
const BIND_RE = new RegExp(`\\b(${NAME})\\s*=\\s*(${LOOKUP})`, 'g');
const LOOKUP_RE = /(getElementById|querySelector)\(\s*['"]([^'"]+)['"]/;
const HREF_RES = [new RegExp(`${RECV}\\s*\\.\\s*href\\s*=(?!=)\\s*${QUOTED}`, 'g'), new RegExp(`${RECV}\\s*\\.\\s*setAttribute\\(\\s*['"]href['"]\\s*,\\s*${QUOTED}`, 'g')];
const LISTEN_RE = new RegExp(`${RECV}\\s*\\.\\s*addEventListener\\(\\s*['"](click|submit)['"]`, 'g');
const ON_RE = new RegExp(`${RECV}\\s*\\.\\s*on(click|submit)\\s*=(?!=)`, 'g');
const FUNCTION_RE = new RegExp(`\\bfunction\\s+(${NAME})\\s*\\([^)]*\\)\\s*\\{`, 'g');
const ARROW_RE = new RegExp(`\\b(?:const|let|var)\\s+(${NAME})\\s*=\\s*(?:async\\s*)?(?:function\\b[^{]*\\{|\\([^)]*\\)\\s*=>|${NAME}\\s*=>)`, 'g');
const GLOBALS = new Set(['location', 'window', 'document', 'self', 'top', 'parent', 'this', 'e', 'event']);
const OPEN: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
const SEGMENT_MAX = 4000;

function skipString(src: string, at: number): number {
  const quote = src[at];
  let i = at + 1;
  while (i < src.length && src[i] !== quote) i += src[i] === '\\' ? 2 : 1;
  return i;
}

function isQuote(ch: string | undefined): boolean {
  return ch === '"' || ch === "'" || ch === '`';
}

function balancedEnd(src: string, open: number): number {
  const stack: string[] = [];
  const limit = Math.min(src.length, open + SEGMENT_MAX);
  for (let i = open; i < limit; i += 1) {
    const ch = src[i] as string;
    if (isQuote(ch)) i = skipString(src, i);
    else if (OPEN[ch]) stack.push(OPEN[ch]);
    else if (ch === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return i + 1;
    }
  }
  return limit;
}

function statementEnd(src: string, from: number): number {
  const limit = Math.min(src.length, from + SEGMENT_MAX);
  for (let i = from; i < limit; i += 1) {
    const ch = src[i] as string;
    if (isQuote(ch)) i = skipString(src, i);
    else if (OPEN[ch]) i = balancedEnd(src, i) - 1;
    else if (ch === ';' || ch === '\n' || ch === '}' || ch === ')') return i;
  }
  return limit;
}

function literal(match: RegExpMatchArray, offset: number): string | null {
  const value = (match[offset + 1] ?? '').trim();
  return value === '' || value.startsWith('#') || /^javascript:/i.test(value) ? null : value;
}

function locationIn(code: string): string | null {
  let best: { at: number; href: string } | null = null;
  for (const re of LOCATION_RES) {
    for (const match of code.matchAll(re)) {
      const href = literal(match, 1);
      if (href && (!best || (match.index ?? 0) < best.at)) best = { at: match.index ?? 0, href };
    }
  }
  return best?.href ?? null;
}

function bodyAfter(src: string, end: number): string {
  let i = end;
  while (i < src.length && /\s/.test(src[i] as string)) i += 1;
  return src[i] === '{' ? src.slice(i, balancedEnd(src, i)) : src.slice(i, statementEnd(src, i));
}

function functionBodies(js: string): Map<string, string> {
  const bodies = new Map<string, string>();
  for (const re of [FUNCTION_RE, ARROW_RE]) {
    for (const match of js.matchAll(re)) {
      const end = (match.index ?? 0) + match[0].length;
      const body = match[0].endsWith('{') ? js.slice(end - 1, balancedEnd(js, end - 1)) : bodyAfter(js, end);
      bodies.set(match[1] as string, body);
    }
  }
  return bodies;
}

function functionTargets(bodies: Map<string, string>): Map<string, string> {
  const targets = new Map<string, string>();
  for (const [name, body] of bodies) {
    const href = locationIn(body);
    if (href) targets.set(name, href);
  }
  for (let pass = 0; pass < 2; pass += 1) {
    for (const [name, body] of bodies) if (!targets.has(name)) {
      const href = calledTarget(body, targets);
      if (href) targets.set(name, href);
    }
  }
  return targets;
}

function calledTarget(code: string, targets: Map<string, string>): string | null {
  for (const match of code.matchAll(new RegExp(`\\b(${NAME})\\s*\\(`, 'g'))) {
    const href = targets.get(match[1] as string);
    if (href) return href;
  }
  return null;
}

function bindingsOf(js: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of js.matchAll(BIND_RE)) {
    const selector = lookupSelector(match[2] as string);
    if (selector) out.set(match[1] as string, selector);
  }
  return out;
}

function lookupSelector(expr: string): string | null {
  const found = LOOKUP_RE.exec(expr);
  if (!found) return null;
  return found[1] === 'getElementById' ? `#${found[2]}` : (found[2] as string).trim();
}

function setFirst(map: Map<string, string>, key: string, value: string): void {
  if (!map.has(key)) map.set(key, value);
}

export function scriptTargets(scripts: readonly string[], hasId: (id: string) => boolean): ScriptTargets {
  const js = scripts.join('\n;\n');
  const bindings = bindingsOf(js);
  const fns = functionTargets(functionBodies(js));
  const targetIn = (code: string): string | null => locationIn(code) ?? calledTarget(code, fns);
  const resolve = (recv: string): string | null => {
    if (recv.startsWith('document')) return lookupSelector(recv);
    if (GLOBALS.has(recv)) return null;
    return bindings.get(recv) ?? (hasId(recv) ? `#${recv}` : null);
  };
  const out: ScriptTargets = { href: new Map(), click: new Map(), submit: new Map(), onAttr: (code) => (code ? targetIn(code) : null) };
  for (const re of HREF_RES) {
    for (const match of js.matchAll(re)) {
      const selector = resolve(match[1] as string);
      const href = literal(match, 2);
      if (selector && href) setFirst(out.href, selector, href);
    }
  }
  for (const match of js.matchAll(LISTEN_RE)) {
    const open = js.indexOf('(', (match.index ?? 0) + (match[1] as string).length);
    addHandler(out, resolve(match[1] as string), match[2] as string, targetIn(js.slice(open, balancedEnd(js, open))));
  }
  for (const match of js.matchAll(ON_RE)) addHandler(out, resolve(match[1] as string), match[2] as string, targetIn(bodyAfter(js, (match.index ?? 0) + match[0].length)));
  return out;
}

function addHandler(out: ScriptTargets, selector: string | null, event: string, href: string | null): void {
  if (!selector || !href) return;
  setFirst(event === 'submit' ? out.submit : out.click, selector, href);
}
