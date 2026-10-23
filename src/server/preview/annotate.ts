import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { BRIDGE_SCRIPT_PATH, SOURCE_LOC_ATTR } from '../../shared/contracts.js';

type ParentNode = DefaultTreeAdapterMap['parentNode'];
type ChildNode = DefaultTreeAdapterMap['childNode'];
type Element = DefaultTreeAdapterMap['element'];
type Template = DefaultTreeAdapterMap['template'];

interface Insertion {
  offset: number;
  text: string;
}

export const BRIDGE_SCRIPT_TAG = `<script src="${BRIDGE_SCRIPT_PATH}"></script>`;

function isElement(node: ChildNode | ParentNode): node is Element {
  return 'tagName' in node;
}

function childrenOf(node: ParentNode): ChildNode[] {
  if (isElement(node) && node.tagName === 'template') {
    return (node as Template).content.childNodes;
  }
  return node.childNodes;
}

function findElement(root: ParentNode, tagName: string): Element | null {
  for (const child of childrenOf(root)) {
    if (!isElement(child)) continue;
    if (child.tagName === tagName) return child;
    const found = findElement(child, tagName);
    if (found) return found;
  }
  return null;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function collectLocInsertions(root: ParentNode, file: string, out: Insertion[]): void {
  for (const child of childrenOf(root)) {
    if (!isElement(child)) continue;
    const startTag = child.sourceCodeLocation?.startTag;
    const hasLoc = child.attrs.some((attr) => attr.name === SOURCE_LOC_ATTR);
    if (startTag && !hasLoc) {
      const loc = `${file}:${startTag.startLine}:${startTag.startCol}`;
      out.push({
        offset: startTag.startOffset + 1 + child.tagName.length,
        text: ` ${SOURCE_LOC_ATTR}="${escapeAttr(loc)}"`,
      });
    }
    collectLocInsertions(child, file, out);
  }
}

function bridgeInsertionOffset(document: ParentNode): number {
  const head = findElement(document, 'head');
  const headTag = head?.sourceCodeLocation?.startTag;
  if (headTag) return headTag.endOffset;
  const html = findElement(document, 'html');
  const htmlTag = html?.sourceCodeLocation?.startTag;
  if (htmlTag) return htmlTag.endOffset;
  const doctype = document.childNodes.find((node) => node.nodeName === '#documentType');
  const doctypeEnd = doctype?.sourceCodeLocation?.endOffset;
  if (doctypeEnd !== undefined) return doctypeEnd;
  return 0;
}

export function annotateHtml(source: string, file: string, options: { injectBridge?: boolean } = {}): string {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const insertions: Insertion[] = [];
  const body = findElement(document, 'body');
  if (body) collectLocInsertions(body, file, insertions);
  if (options.injectBridge !== false) {
    insertions.push({ offset: bridgeInsertionOffset(document), text: BRIDGE_SCRIPT_TAG });
  }
  return applyInsertions(source, insertions);
}

function applyInsertions(source: string, insertions: Insertion[]): string {
  const ordered = insertions.map((insertion, index) => ({ insertion, index }));
  ordered.sort((a, b) => a.insertion.offset - b.insertion.offset || b.index - a.index);
  const chunks: string[] = [];
  let cursor = 0;
  for (const { insertion } of ordered) {
    chunks.push(source.slice(cursor, insertion.offset), insertion.text);
    cursor = insertion.offset;
  }
  chunks.push(source.slice(cursor));
  return chunks.join('');
}
