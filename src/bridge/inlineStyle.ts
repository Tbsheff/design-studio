const AUTHORED_KEYS = ['box-shadow', 'filter', 'flex', 'align-self'];
const AUTHORED_SIZE_KEYS = ['width', 'height'];
const AUTHORED_SIZE_RE = /(content|%)$/;

function declarations(styleText: string): Map<string, string> {
  const out = new Map<string, string>();
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  const push = (): void => {
    const colon = current.indexOf(':');
    if (colon > 0) out.set(current.slice(0, colon).trim().toLowerCase(), current.slice(colon + 1).trim());
    current = '';
  };
  for (const char of styleText) {
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    } else if (char === ';' && depth === 0) {
      push();
      continue;
    }
    current += char;
  }
  push();
  return out;
}

function authoredStyles(element: Element): Record<string, string> {
  const text = element.getAttribute('style');
  if (!text) return {};
  const inline = declarations(text);
  const out: Record<string, string> = {};
  for (const key of AUTHORED_KEYS) {
    const value = inline.get(key);
    if (value) out[key] = value;
  }
  for (const key of AUTHORED_SIZE_KEYS) {
    const value = inline.get(key);
    if (value && AUTHORED_SIZE_RE.test(value)) out[key] = value;
  }
  return out;
}

export function layoutStyles(element: Element, computed: CSSStyleDeclaration): Record<string, string> {
  const parent = element.parentElement ? window.getComputedStyle(element.parentElement) : null;
  return {
    ...authoredStyles(element),
    'used-width': computed.width,
    'used-height': computed.height,
    'parent-display': parent?.display ?? '',
    'parent-flex-direction': parent?.flexDirection ?? '',
  };
}

export function isLayoutKey(event: KeyboardEvent): boolean {
  return event.code === 'KeyA' && event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat;
}
