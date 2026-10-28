import type * as t from '@babel/types';
import type { ClassSite, Segment } from './plan.js';

const MERGERS = new Set(['cn', 'clsx', 'classnames', 'classNames', 'cx', 'twMerge', 'twJoin', 'tw', 'cls']);
const SKIP_KEYS = new Set(['loc', 'leadingComments', 'trailingComments', 'innerComments', 'extra', 'start', 'end', 'type']);

function rangeOf(node: t.Node): { start: number; end: number } {
  if (typeof node.start !== 'number' || typeof node.end !== 'number') throw new Error('missing source position');
  return { start: node.start, end: node.end };
}

function classAttribute(element: t.JSXElement): t.JSXAttribute | null {
  for (const attribute of element.openingElement.attributes) {
    if (attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && (attribute.name.name === 'className' || attribute.name.name === 'class')) return attribute;
  }
  return null;
}

function literalSegment(source: string, node: t.StringLiteral, editable: boolean, escape: Segment['escape']): Segment {
  const { start, end } = rangeOf(node);
  const text = source.slice(start + 1, end - 1);
  return { start: start + 1, end: end - 1, text, editable: editable && !text.includes('\\'), direct: true, glueStart: false, glueEnd: false, quote: source[start] ?? '"', escape };
}

function templateSegments(node: t.TemplateLiteral, editable: boolean): Segment[] {
  return node.quasis.map((quasi, index) => {
    const { start, end } = rangeOf(quasi);
    const text = quasi.value.raw;
    return { start, end, text, editable: editable && !text.includes('\\'), direct: node.expressions.length === 0, glueStart: index > 0, glueEnd: index < node.quasis.length - 1, quote: '`', escape: 'js' };
  });
}

interface Walk {
  source: string;
  segments: Segment[];
  dynamic: boolean;
  sources: string[];
}

function isNode(value: unknown): value is t.Node {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function describe(node: t.Node, source: string): string {
  const { start, end } = rangeOf(node);
  const text = source.slice(start, end).replace(/\s+/g, ' ');
  if (node.type === 'CallExpression') {
    const callee = source.slice(rangeOf(node.callee).start, rangeOf(node.callee).end);
    return `${callee}()`;
  }
  return text.length > 40 ? `${text.slice(0, 39)}…` : text;
}

function keySegment(source: string, key: t.Identifier): Segment {
  const { start, end } = rangeOf(key);
  return { start, end, text: key.name, editable: false, direct: false, glueStart: false, glueEnd: false, quote: '', escape: 'js' };
}

function collectProperty(node: t.ObjectProperty, walk: Walk): void {
  if (node.computed) {
    walk.dynamic = true;
    return;
  }
  if (node.key.type === 'StringLiteral') walk.segments.push(literalSegment(walk.source, node.key, false, 'js'));
  else if (node.key.type === 'Identifier') walk.segments.push(keySegment(walk.source, node.key));
}

function collectChildren(node: t.Node, walk: Walk): void {
  for (const [key, value] of Object.entries(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const items: unknown[] = Array.isArray(value) ? value : [value];
    for (const item of items) if (isNode(item)) collectReadOnly(item, walk);
  }
}

function collectReadOnly(node: t.Node, walk: Walk): void {
  switch (node.type) {
    case 'StringLiteral':
      walk.segments.push(literalSegment(walk.source, node, false, 'js'));
      return;
    case 'TemplateLiteral':
      walk.segments.push(...templateSegments(node, false));
      for (const expression of node.expressions) collectReadOnly(expression, walk);
      return;
    case 'ObjectProperty':
      collectProperty(node, walk);
      return;
    case 'Identifier':
    case 'MemberExpression':
      walk.dynamic = true;
      return;
    case 'CallExpression':
      walk.dynamic = true;
      walk.sources.push(describe(node, walk.source));
      break;
    default:
      break;
  }
  collectChildren(node, walk);
}

function argSegments(arg: t.Node, walk: Walk): void {
  if (arg.type === 'StringLiteral') {
    walk.segments.push(literalSegment(walk.source, arg, true, 'js'));
    return;
  }
  if (arg.type === 'TemplateLiteral') {
    walk.segments.push(...templateSegments(arg, true));
    walk.dynamic ||= arg.expressions.length > 0;
    for (const expression of arg.expressions) collectReadOnly(expression, walk);
    return;
  }
  walk.dynamic = true;
  collectReadOnly(arg, walk);
}

function isMerger(node: t.Expression): node is t.CallExpression {
  return node.type === 'CallExpression' && node.callee.type === 'Identifier' && MERGERS.has(node.callee.name);
}

function expressionSite(expression: t.Expression, walk: Walk): string | null {
  if (expression.type === 'StringLiteral') {
    walk.segments.push(literalSegment(walk.source, expression, true, 'js'));
    return null;
  }
  if (expression.type === 'TemplateLiteral') {
    argSegments(expression, walk);
    return null;
  }
  if (isMerger(expression)) {
    for (const arg of expression.arguments) argSegments(arg, walk);
    if (!walk.segments.some((segment) => segment.editable)) return `The classes come from ${walk.sources[0] ?? describe(expression, walk.source)}`;
    return null;
  }
  return `The className comes from ${describe(expression, walk.source)}`;
}

export function jsxClassSite(source: string, element: t.JSXElement): ClassSite {
  const attribute = classAttribute(element);
  const nameEnd = rangeOf(element.openingElement.name).end;
  if (!attribute) {
    return { segments: [], dynamic: false, unsafe: null, create: (classes) => ({ start: nameEnd, end: nameEnd, text: ` className="${classes}"` }) };
  }
  const value = attribute.value;
  const walk: Walk = { source, segments: [], dynamic: false, sources: [] };
  if (value?.type === 'StringLiteral') {
    walk.segments.push(literalSegment(source, value, true, 'jsx'));
    return { segments: walk.segments, dynamic: false, unsafe: null, create: null };
  }
  if (value?.type !== 'JSXExpressionContainer' || value.expression.type === 'JSXEmptyExpression') {
    return { segments: [], dynamic: true, unsafe: 'The className is not a string', create: null };
  }
  const unsafe = expressionSite(value.expression, walk);
  return { segments: walk.segments, dynamic: walk.dynamic, unsafe, create: null };
}
