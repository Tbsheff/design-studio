import { authoredSizes } from './authored.js';
import { ARRANGE_SHORTCUTS } from '../shared/arrange.js';

export const REMOVE_LAYOUT_CHORD = 'Alt+Shift+KeyA';

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
  const sizes = authoredSizes(element);
  return {
    ...authoredStyles(element),
    'authored-width': sizes.width ?? '',
    'authored-height': sizes.height ?? '',
    'parent-align-items': parent?.alignItems ?? '',
    'parent-justify-items': parent?.justifyItems ?? '',
    'own-justify-self': computed.justifySelf,
    'used-width': computed.width,
    'used-height': computed.height,
    'parent-display': parent?.display ?? '',
    'parent-flex-direction': parent?.flexDirection ?? '',
    ...offsetStyles(element, computed),
  };
}

function offsetStyles(element: Element, computed: CSSStyleDeclaration): Record<string, string> {
  if (!(element instanceof HTMLElement)) return {};
  const left = element.offsetLeft - (parseFloat(computed.marginLeft) || 0);
  const top = element.offsetTop - (parseFloat(computed.marginTop) || 0);
  return { 'offset-left': `${Math.round(left)}px`, 'offset-top': `${Math.round(top)}px` };
}

export function arrangeChordOf(event: KeyboardEvent): string | null {
  if (event.metaKey || event.repeat || !event.altKey) return null;
  const chord = `${event.ctrlKey ? 'Ctrl+' : ''}Alt+${event.shiftKey ? 'Shift+' : ''}${event.code}`;
  return chord in ARRANGE_SHORTCUTS || chord === REMOVE_LAYOUT_CHORD ? chord : null;
}

export function isLayoutKey(event: KeyboardEvent): boolean {
  return event.code === 'KeyA' && event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat;
}
