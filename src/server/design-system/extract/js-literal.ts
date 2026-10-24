export type JsValue = string | JsValue[] | { [key: string]: JsValue };

const IDENT = /[A-Za-z_$][\w$-]*|\d+/y;
const MAX_DEPTH = 8;

class JsReader {
  index: number;

  constructor(
    private readonly text: string,
    start: number,
  ) {
    this.index = start;
  }

  private peek(): string | undefined {
    return this.text[this.index];
  }

  private skipComment(): boolean {
    const close = this.text.startsWith('//', this.index) ? '\n' : this.text.startsWith('/*', this.index) ? '*/' : null;
    if (!close) return false;
    const end = this.text.indexOf(close, this.index + 2);
    this.index = end < 0 ? this.text.length : end + close.length;
    return true;
  }

  skip(): void {
    while (this.index < this.text.length) {
      if (/\s/.test(this.text[this.index]!)) this.index += 1;
      else if (!this.skipComment()) return;
    }
  }

  readString(): string | null {
    const quote = this.peek();
    if (quote !== '"' && quote !== "'" && quote !== '`') return null;
    let out = '';
    this.index += 1;
    while (this.index < this.text.length && this.text[this.index] !== quote) {
      if (this.text[this.index] === '\\') this.index += 1;
      out += this.text[this.index] ?? '';
      this.index += 1;
    }
    this.index += 1;
    return out;
  }

  private readKey(): string | null {
    const quoted = this.readString();
    if (quoted !== null) return quoted;
    IDENT.lastIndex = this.index;
    const match = IDENT.exec(this.text);
    if (!match) return null;
    this.index += match[0].length;
    return match[0];
  }

  skipValue(): void {
    let depth = 0;
    while (this.index < this.text.length) {
      const char = this.text[this.index]!;
      if (char === '"' || char === "'" || char === '`') {
        this.readString();
        continue;
      }
      if ('{[('.includes(char)) depth += 1;
      if ('}])'.includes(char)) {
        if (depth === 0) return;
        depth -= 1;
      }
      if (char === ',' && depth === 0) return;
      this.index += 1;
    }
  }

  private skipComma(): void {
    this.skip();
    if (this.peek() === ',') this.index += 1;
  }

  private closes(char: string): boolean {
    this.skip();
    if (this.peek() !== char && this.index < this.text.length) return false;
    this.index += 1;
    return true;
  }

  private readArray(depth: number): JsValue[] {
    this.index += 1;
    const items: JsValue[] = [];
    while (!this.closes(']')) {
      const item = this.readValue(depth + 1);
      if (item !== undefined) items.push(item);
      else this.skipValue();
      this.skipComma();
    }
    return items;
  }

  private readEntry(object: Record<string, JsValue>, depth: number): boolean {
    if (this.text.startsWith('...', this.index)) {
      this.skipValue();
      return true;
    }
    const key = this.readKey();
    if (key === null) return false;
    this.skip();
    if (this.peek() !== ':') {
      this.skipValue();
      return true;
    }
    this.index += 1;
    const value = this.readValue(depth + 1);
    if (value !== undefined) object[key] = value;
    else this.skipValue();
    return true;
  }

  private readObject(depth: number): Record<string, JsValue> {
    this.index += 1;
    const object: Record<string, JsValue> = {};
    while (!this.closes('}')) {
      if (!this.readEntry(object, depth)) return object;
      this.skipComma();
    }
    return object;
  }

  readValue(depth: number): JsValue | undefined {
    this.skip();
    if (depth > MAX_DEPTH) return undefined;
    const char = this.peek();
    if (char === '"' || char === "'" || char === '`') return this.readString() ?? undefined;
    if (char === '[') return this.readArray(depth);
    if (char === '{') return this.readObject(depth);
    return undefined;
  }
}

export function parseJsLiteral(text: string, start: number): JsValue | null {
  return new JsReader(text, start).readValue(0) ?? null;
}

export function objectAfter(text: string, key: string): Record<string, JsValue> | null {
  const pattern = new RegExp(`\\b${key}\\s*:\\s*\\{`, 'g');
  let found: Record<string, JsValue> | null = null;
  for (const match of text.matchAll(pattern)) {
    const value = parseJsLiteral(text, (match.index ?? 0) + match[0].length - 1);
    if (value && typeof value === 'object' && !Array.isArray(value)) found = { ...(found ?? {}), ...value };
  }
  return found;
}

export function flattenJs(value: JsValue, prefix: string[], out: Map<string, string>): void {
  if (typeof value === 'string') out.set(prefix.join('-'), value);
  else if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string')) out.set(prefix.join('-'), (value as string[]).join(', '));
  } else for (const [key, child] of Object.entries(value)) flattenJs(child, key === 'DEFAULT' ? prefix : [...prefix, key], out);
}
