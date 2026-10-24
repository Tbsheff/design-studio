import { SOURCE_LOC_ATTR, type ParentToBridge } from '../shared/contracts.js';

type SelectSource = Extract<ParentToBridge, { type: 'select-source' }>;

export function elementBySource(message: SelectSource, textOf: (element: Element) => string): Element | null {
  const { sourceLoc, tag, text } = message;
  if (typeof sourceLoc !== 'string' || typeof tag !== 'string' || typeof text !== 'string') return null;
  for (const element of Array.from(document.querySelectorAll(`[${SOURCE_LOC_ATTR}]`))) {
    if (element.getAttribute(SOURCE_LOC_ATTR) !== sourceLoc || element.tagName.toLowerCase() !== tag) continue;
    if (text === '' || textOf(element) === text) return element;
  }
  return null;
}
