import type { DefaultTreeAdapterMap } from 'parse5';
import type { ClassSite } from './plan.js';

type Element = DefaultTreeAdapterMap['element'];

export function htmlClassSite(source: string, element: Element): ClassSite {
  const location = element.sourceCodeLocation;
  const startTag = location?.startTag;
  if (!startTag) return { segments: [], dynamic: false, unsafe: 'The element has no source location', create: null };
  const attrLocation = location.attrs?.class;
  if (!attrLocation) {
    const at = startTag.startOffset + 1 + element.tagName.length;
    return { segments: [], dynamic: false, unsafe: null, create: (classes) => ({ start: at, end: at, text: ` class="${classes}"` }) };
  }
  const raw = source.slice(attrLocation.startOffset, attrLocation.endOffset);
  const quoted = /^class\s*=\s*(["'])/i.exec(raw);
  if (!quoted || !raw.endsWith(quoted[1] ?? '"')) return { segments: [], dynamic: false, unsafe: 'The class attribute is not quoted', create: null };
  const start = attrLocation.startOffset + quoted[0].length;
  const end = attrLocation.endOffset - 1;
  const text = source.slice(start, end);
  const editable = !/[&{}]/.test(text);
  return {
    segments: [{ start, end, text, editable, direct: true, glueStart: false, glueEnd: false, quote: quoted[1] ?? '"', escape: 'html' }],
    dynamic: false,
    unsafe: editable ? null : 'The class attribute has entities or template syntax',
    create: null,
  };
}
