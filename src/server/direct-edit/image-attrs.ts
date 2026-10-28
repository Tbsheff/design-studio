import type * as t from '@babel/types';
import { parse } from 'parse5';
import { DirectEditError } from './errors.js';
import type { SourcePosition } from './errors.js';
import { findElementAt } from './html.js';
import { findJsxElement, parseSource } from './jsx.js';
import { attrName, attributeText, insertion, quoteOf, rangeOf, removalRange } from './props.js';
import { applySplices, leadingWhitespaceStart, type Splice } from './splice.js';

export type AttrChanges = Record<string, string | null>;

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function setHtmlAttrs(source: string, position: SourcePosition, changes: AttrChanges): string {
  const element = findElementAt(parse(source, { sourceCodeLocationInfo: true }), position);
  const location = element?.sourceCodeLocation;
  if (!element || !location?.startTag) throw new DirectEditError('stale_selection', 'The element is no longer at that place in the file. Select it again.');
  const at = location.startTag.startOffset + 1 + element.tagName.length;
  const splices: Splice[] = [];
  for (const [name, value] of Object.entries(changes)) {
    const attr = location.attrs?.[name];
    if (attr && value === null) splices.push({ start: leadingWhitespaceStart(source, attr.startOffset), end: attr.endOffset, text: '' });
    else if (attr && value !== null) splices.push({ start: attr.startOffset, end: attr.endOffset, text: `${name}="${escapeAttr(value)}"` });
    else if (value !== null) splices.push({ start: at, end: at, text: ` ${name}="${escapeAttr(value)}"` });
  }
  return applySplices(source, splices);
}

export function jsxElementAt(source: string, position: SourcePosition, typescript: boolean): t.JSXElement {
  const element = findJsxElement(parseSource(source, typescript).program, position);
  if (!element) throw new DirectEditError('stale_selection', 'The element is no longer at that place in the file. Select it again.');
  return element;
}

export function jsxTagName(element: t.JSXElement): { name: string; host: boolean } {
  const node = element.openingElement.name;
  const name = node.type === 'JSXIdentifier' ? node.name : node.type === 'JSXMemberExpression' ? `${(node.object as t.JSXIdentifier).name ?? ''}.${node.property.name}` : `${node.namespace.name}:${node.name.name}`;
  return { name, host: node.type === 'JSXIdentifier' && /^[a-z]/.test(node.name) };
}

function attributeOf(element: t.JSXElement, name: string): t.JSXAttribute | null {
  for (const attribute of element.openingElement.attributes) if (attribute.type === 'JSXAttribute' && attrName(attribute) === name) return attribute;
  return null;
}

function replaceable(attribute: t.JSXAttribute): boolean {
  const value = attribute.value;
  if (!value || value.type === 'StringLiteral') return true;
  if (value.type !== 'JSXExpressionContainer') return false;
  const expression = value.expression;
  if (expression.type === 'StringLiteral' || expression.type === 'Identifier') return true;
  if (expression.type === 'TemplateLiteral') return expression.expressions.length === 0;
  if (expression.type === 'MemberExpression' && expression.object.type === 'Identifier' && /^(images?|assets?|img)$/i.test(expression.object.name)) return true;
  return false;
}

export function setJsxAttrs(source: string, position: SourcePosition, typescript: boolean, changes: AttrChanges): string {
  const element = jsxElementAt(source, position, typescript);
  const quote = quoteOf(source, element);
  const splices: Splice[] = [];
  const added: string[] = [];
  for (const [name, value] of Object.entries(changes)) {
    const attribute = attributeOf(element, name);
    if (attribute && !replaceable(attribute)) {
      const range = rangeOf(attribute.value as t.Node);
      throw new DirectEditError('attribute_not_literal', `${name} comes from ${source.slice(range.start, range.end).slice(0, 80)}, so it is set in code. Change that data, or ask the agent.`);
    }
    if (attribute && value === null) splices.push({ ...removalRange(source, attribute), text: '' });
    else if (attribute && value !== null) splices.push({ ...rangeOf(attribute), text: attributeText(name, value, quote) });
    else if (value !== null) added.push(attributeText(name, value, quote));
  }
  if (added.length > 0) {
    const at = insertion(source, element, added.join(' '));
    splices.push({ start: at.at, end: at.at, text: at.text });
  }
  return applySplices(source, splices);
}

