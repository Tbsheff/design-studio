const VOID_TAGS = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'source', 'track', 'wbr', 'textarea', 'select', 'svg', 'canvas', 'video', 'audio', 'iframe']);
const TEXT_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'button', 'label', 'strong', 'em', 'small', 'code', 'li', 'td', 'th']);

export function insideTarget(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  if (VOID_TAGS.has(tag) || element.closest('svg')) return false;
  if (!TEXT_TAGS.has(tag)) return true;
  return element.children.length > 0 && !Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
}

export function dropElement(x: number, y: number): Element | null {
  const element = document.elementFromPoint(x, y);
  if (!element || element === document.documentElement) return document.body;
  const svg = element.closest('svg');
  return svg?.parentElement ?? element;
}
