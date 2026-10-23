import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { applyDeclarationChanges, parseDeclarations, serializeDeclarations } from './css.js';
import { DirectEditError, TEXT_NOT_EDITABLE_MESSAGE, assertSameTag } from './errors.js';
import type { PatchResult, SourceEdit, SourcePosition } from './errors.js';
import { applySplices, leadingWhitespaceStart, type Splice } from './splice.js';

type ParentNode = DefaultTreeAdapterMap['parentNode'];
type ChildNode = DefaultTreeAdapterMap['childNode'];
type Element = DefaultTreeAdapterMap['element'];
type Template = DefaultTreeAdapterMap['template'];
type TextNode = DefaultTreeAdapterMap['textNode'];

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
const NON_TEXT_ELEMENTS = new Set(['script', 'style', 'template', 'iframe', 'noscript', 'xmp', 'noembed', 'noframes', 'plaintext']);

function isElement(node: ChildNode | ParentNode): node is Element {
  return 'tagName' in node;
}

function isTextNode(node: ChildNode): node is TextNode {
  return node.nodeName === '#text';
}

function childrenOf(node: ParentNode): ChildNode[] {
  if (isElement(node) && node.tagName === 'template') return (node as Template).content.childNodes;
  return node.childNodes;
}

function startsAt(element: Element, position: SourcePosition): boolean {
  const startTag = element.sourceCodeLocation?.startTag;
  return startTag !== undefined && startTag.startLine === position.line && startTag.startCol === position.col;
}

function findElementAt(root: ParentNode, position: SourcePosition): Element | null {
  for (const child of childrenOf(root)) {
    if (!isElement(child)) continue;
    if (startsAt(child, position)) return child;
    const nested = findElementAt(child, position);
    if (nested) return nested;
  }
  return null;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function startTagOf(element: Element): NonNullable<NonNullable<Element['sourceCodeLocation']>['startTag']> {
  const startTag = element.sourceCodeLocation?.startTag;
  if (!startTag) throw new DirectEditError('element_not_found', 'The element has no source location');
  return startTag;
}

function styleSplice(source: string, element: Element, style: Record<string, string | null>): Splice | null {
  const attr = element.attrs.find((entry) => entry.name === 'style');
  const attrLocation = element.sourceCodeLocation?.attrs?.style;
  const declarations = applyDeclarationChanges(attr ? parseDeclarations(attr.value) : [], style);
  const serialized = serializeDeclarations(declarations);
  if (attr && attrLocation) {
    if (serialized === '') {
      return { start: leadingWhitespaceStart(source, attrLocation.startOffset), end: attrLocation.endOffset, text: '' };
    }
    return { start: attrLocation.startOffset, end: attrLocation.endOffset, text: `style="${escapeAttr(serialized)}"` };
  }
  if (serialized === '') return null;
  const insertAt = startTagOf(element).startOffset + 1 + element.tagName.length;
  return { start: insertAt, end: insertAt, text: ` style="${escapeAttr(serialized)}"` };
}

function assertTextTarget(element: Element): ChildNode[] {
  if (VOID_ELEMENTS.has(element.tagName) || NON_TEXT_ELEMENTS.has(element.tagName)) {
    throw new DirectEditError('text_not_editable', `The text of <${element.tagName}> cannot be edited directly`);
  }
  const children = childrenOf(element);
  const onlyText = children.length === 0 || (children.length === 1 && children[0] !== undefined && isTextNode(children[0]));
  if (!onlyText) throw new DirectEditError('text_not_editable', TEXT_NOT_EDITABLE_MESSAGE);
  return children;
}

function textSplice(source: string, element: Element, text: string): Splice {
  const children = assertTextTarget(element);
  const escaped = escapeText(text);
  const [child] = children;
  if (child === undefined) {
    if (!element.sourceCodeLocation?.endTag) {
      throw new DirectEditError('text_not_editable', `The <${element.tagName}> element has no end tag`);
    }
    const at = startTagOf(element).endOffset;
    return { start: at, end: at, text: escaped };
  }
  const location = child.sourceCodeLocation;
  if (!location) throw new DirectEditError('text_not_editable', 'The text has no source location');
  const raw = source.slice(location.startOffset, location.endOffset);
  if (raw.trim() === '') return { start: location.startOffset, end: location.endOffset, text: escaped };
  const lead = /^\s*/.exec(raw)?.[0] ?? '';
  const trail = /\s*$/.exec(raw)?.[0] ?? '';
  return { start: location.startOffset, end: location.endOffset, text: `${lead}${escaped}${trail}` };
}

export function patchHtml(source: string, loc: SourcePosition, edit: SourceEdit): PatchResult {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const element = findElementAt(document, loc);
  if (!element) throw new DirectEditError('element_not_found', `No element starts at line ${loc.line}, column ${loc.col}`);
  assertSameTag(edit.tag, element.tagName);
  const splices: Splice[] = [];
  const style = edit.style ?? {};
  const styleKeys = Object.keys(style);
  if (styleKeys.length > 0) {
    const splice = styleSplice(source, element, style);
    if (splice) splices.push(splice);
  }
  const hasText = edit.text !== undefined;
  if (edit.text !== undefined) splices.push(textSplice(source, element, edit.text));
  return { code: applySplices(source, splices), tag: element.tagName, applied: { style: styleKeys, text: hasText } };
}
