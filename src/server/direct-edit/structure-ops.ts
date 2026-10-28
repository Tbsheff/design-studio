import type { StructureOp } from '../../shared/contracts.js';
import { DirectEditError } from './errors.js';

export interface Range {
  start: number;
  end: number;
}

export interface StructNode extends Range {
  tag: string;
  parent: number;
  root: boolean;
  fixed: boolean;
  inner: Range | null;
  selfClose: Range | null;
  children: Range[];
}

export interface Frame {
  open: string;
  close: string;
}

export interface Placement {
  into?: StructNode;
  before?: StructNode;
  after?: StructNode;
}

export interface OpInput {
  op: StructureOp;
  nodes: StructNode[];
  place: Placement;
  frame: Frame;
  closeTag: (node: StructNode) => string;
}

export interface OpPlan {
  code: string;
  select: number[];
}

interface Splice extends Range {
  text: string;
  marks: number[];
}

const INDENT_STEP = '  ';
const NO_REINDENT = /<pre|<textarea|`/i;
const ROOT_MESSAGE = 'This is the top element of a component, so it cannot be removed or copied here; ask the agent';

export function refuse(message: string): DirectEditError {
  return new DirectEditError('cannot_restructure', message);
}

function lineStart(source: string, offset: number): number {
  return source.lastIndexOf('\n', offset - 1) + 1;
}

function indentAt(source: string, offset: number): string | null {
  const lead = source.slice(lineStart(source, offset), offset);
  return /^[ \t]*$/.test(lead) ? lead : null;
}

function restOfLineBlank(source: string, offset: number): boolean {
  const next = source.indexOf('\n', offset);
  return /^[ \t\r]*$/.test(source.slice(offset, next < 0 ? source.length : next));
}

function ownLine(source: string, range: Range): boolean {
  return indentAt(source, range.start) !== null && restOfLineBlank(source, range.end);
}

function newlineBefore(source: string, start: number): number {
  const at = lineStart(source, start) - 1;
  return source[at - 1] === '\r' ? at - 1 : at;
}

function removalSpan(source: string, node: Range): Range {
  if (!ownLine(source, node)) return { start: node.start, end: node.end };
  let end = node.end;
  while (source[end] === ' ' || source[end] === '\t') end += 1;
  if (lineStart(source, node.start) > 0) return { start: newlineBefore(source, node.start), end };
  if (source[end] === '\r') end += 1;
  return { start: 0, end: source[end] === '\n' ? end + 1 : end };
}

function reindent(text: string, from: string | null, to: string | null): string {
  if (from === null || to === null || from === to || NO_REINDENT.test(text)) return text;
  return text
    .split('\n')
    .map((line, index) => (index > 0 && line.startsWith(from) ? to + line.slice(from.length) : line))
    .join('\n');
}

function applyTracked(source: string, splices: Splice[]): OpPlan {
  const ordered = [...splices].sort((a, b) => a.start - b.start || a.end - b.end);
  let code = '';
  let cursor = 0;
  const select: number[] = [];
  for (const splice of ordered) {
    if (splice.start < cursor) throw refuse('These elements overlap in the source');
    code += source.slice(cursor, splice.start);
    for (const mark of splice.marks) select.push(code.length + mark);
    code += splice.text;
    cursor = splice.end;
  }
  return { code: code + source.slice(cursor), select };
}

function removal(source: string, node: StructNode): Splice {
  return { ...removalSpan(source, node), text: '', marks: [] };
}

function assertMovable(node: StructNode): void {
  if (node.fixed) throw refuse(`<${node.tag}> cannot be changed this way`);
  if (node.root) throw refuse(ROOT_MESSAGE);
}

function deleteOp(source: string, nodes: StructNode[]): Splice[] {
  nodes.forEach(assertMovable);
  return nodes.map((node) => removal(source, node));
}

function duplicateOp(source: string, nodes: StructNode[]): Splice[] {
  return nodes.map((node) => {
    assertMovable(node);
    const text = source.slice(node.start, node.end);
    const indent = indentAt(source, node.start);
    if (indent === null || !ownLine(source, node)) return { start: node.end, end: node.end, text, marks: [0] };
    return { start: node.end, end: node.end, text: `\n${indent}${text}`, marks: [1 + indent.length] };
  });
}

function wrapOp(source: string, nodes: StructNode[], frame: Frame): Splice[] {
  const [first, ...rest] = nodes;
  if (!first) return [];
  if (nodes.some((node) => node.parent !== first.parent)) throw refuse('Select elements with the same parent to wrap them in one frame');
  if (nodes.some((node) => node.fixed)) throw refuse(`<${nodes.find((node) => node.fixed)?.tag}> cannot be wrapped`);
  if (nodes.length > 1 && nodes.some((node) => node.root)) throw refuse(ROOT_MESSAGE);
  const indent = indentAt(source, first.start);
  const texts = nodes.map((node) => ({ text: source.slice(node.start, node.end), indent: indentAt(source, node.start) }));
  const lined = indent !== null && ownLine(source, first);
  const inner = lined
    ? texts.map((entry) => `\n${indent}${INDENT_STEP}${reindent(entry.text, entry.indent, indent + INDENT_STEP)}`).join('') + `\n${indent}`
    : texts.map((entry) => entry.text).join('');
  const wrapper = { start: first.start, end: first.end, text: `${frame.open}${inner}${frame.close}`, marks: [0] };
  return [wrapper, ...rest.map((node) => removal(source, node))];
}

function unwrapOne(source: string, node: StructNode): Splice {
  if (node.fixed) throw refuse(`<${node.tag}> cannot be unwrapped`);
  if (!node.inner) throw refuse(`<${node.tag}> has no children to keep`);
  const raw = source.slice(node.inner.start, node.inner.end);
  const lead = raw.length - raw.trimStart().length;
  const body = raw.trim();
  if (body === '') throw refuse(`<${node.tag}> is empty; delete it instead`);
  const bodyStart = node.inner.start + lead;
  const onlyChild = node.children.length === 1 && node.children[0]?.start === bodyStart && node.children[0].end === bodyStart + body.length;
  if (node.root && !onlyChild) throw refuse('The top element of a component can be unwrapped only when it has exactly one child element');
  const from = indentAt(source, bodyStart) ?? lastLineIndent(raw);
  const to = indentAt(source, node.start);
  const marks = node.children.map((child) => reindent(body.slice(0, child.start - bodyStart), from, to).length);
  return { start: node.start, end: node.end, text: reindent(body, from, to), marks };
}

function lastLineIndent(raw: string): string | null {
  const match = /\n([ \t]*)\S/.exec(raw);
  return match?.[1] ?? null;
}

function unwrapOp(source: string, nodes: StructNode[]): Splice[] {
  return nodes.map((node) => unwrapOne(source, node));
}

function contains(outer: Range, inner: Range): boolean {
  return inner.start >= outer.start && inner.end <= outer.end;
}

function movedTexts(source: string, nodes: StructNode[], indent: string | null): string[] {
  return nodes.map((node) => reindent(source.slice(node.start, node.end), indentAt(source, node.start), indent));
}

function joinLines(pieces: string[], indent: string, prefix: string): { text: string; marks: number[] } {
  let text = '';
  const marks: number[] = [];
  for (const piece of pieces) {
    text += `${prefix}${indent}`;
    marks.push(text.length);
    text += piece;
  }
  return { text, marks };
}

function joinInline(pieces: string[]): { text: string; marks: number[] } {
  let text = '';
  const marks: number[] = [];
  for (const piece of pieces) {
    marks.push(text.length);
    text += piece;
  }
  return { text, marks };
}

function assertContainer(parent: StructNode): void {
  if (!parent.inner && !parent.selfClose) throw refuse(`<${parent.tag}> cannot hold child elements`);
}

function intoSplice(source: string, texts: (indent: string | null) => string[], parent: StructNode, closeTag: string): Splice {
  assertContainer(parent);
  const parentIndent = indentAt(source, parent.start);
  const childIndent = parentIndent === null ? null : parentIndent + INDENT_STEP;
  const pieces = texts(childIndent);
  if (childIndent === null) {
    const inline = joinInline(pieces);
    if (parent.selfClose) return { ...parent.selfClose, text: `>${inline.text}${closeTag}`, marks: inline.marks.map((mark) => mark + 1) };
    const at = (parent.inner as Range).end;
    return { start: at, end: at, ...inline };
  }
  const lines = joinLines(pieces, childIndent, '\n');
  if (parent.selfClose) return { ...parent.selfClose, text: `>${lines.text}\n${parentIndent}${closeTag}`, marks: lines.marks.map((mark) => mark + 1) };
  const end = (parent.inner as Range).end;
  const closeOwnLine = indentAt(source, end) !== null && lineStart(source, end) > (parent.inner as Range).start;
  if (closeOwnLine) {
    const at = newlineBefore(source, end);
    return { start: at, end: at, ...lines };
  }
  return { start: end, end, text: `${lines.text}\n${parentIndent}`, marks: lines.marks };
}

function besideSplice(source: string, texts: (indent: string | null) => string[], ref: StructNode, after: boolean): Splice {
  if (ref.root || ref.fixed) throw refuse(`Elements cannot be placed next to <${ref.tag}>`);
  const indent = indentAt(source, ref.start);
  if (indent === null || !ownLine(source, ref)) {
    const inline = joinInline(texts(null));
    const at = after ? ref.end : ref.start;
    return { start: at, end: at, ...inline };
  }
  const pieces = texts(indent);
  if (after) {
    const lines = joinLines(pieces, indent, '\n');
    return { start: ref.end, end: ref.end, ...lines };
  }
  const at = lineStart(source, ref.start);
  let text = '';
  const marks: number[] = [];
  for (const piece of pieces) {
    marks.push(text.length + indent.length);
    text += `${indent}${piece}\n`;
  }
  return { start: at, end: at, text, marks };
}

function placeRef(place: Placement): StructNode {
  const ref = place.into ?? place.before ?? place.after;
  if (!ref) throw refuse('Say where to move the element');
  return ref;
}

function moveOp(source: string, nodes: StructNode[], place: Placement, closeTag: (node: StructNode) => string): Splice[] {
  nodes.forEach(assertMovable);
  const ref = placeRef(place);
  if (nodes.some((node) => contains(node, ref))) throw refuse('An element cannot move into itself or next to its own child');
  const texts = (indent: string | null) => movedTexts(source, nodes, indent);
  const insert = place.into ? intoSplice(source, texts, place.into, closeTag(place.into)) : besideSplice(source, texts, ref, place.after !== undefined);
  return [insert, ...nodes.map((node) => removal(source, node))];
}

export interface InsertInput {
  text: string;
  place: Placement;
  closeTag: (node: StructNode) => string;
  extra?: Range & { text: string };
}

function indentLines(text: string, indent: string | null): string {
  return indent === null ? text : text.split('\n').map((line, index) => (index > 0 && line !== '' ? indent + line : line)).join('\n');
}

export function planInsert(source: string, input: InsertInput): OpPlan {
  const ref = placeRef(input.place);
  if (ref.fixed) throw refuse(`<${ref.tag}> cannot be changed this way`);
  const texts = (indent: string | null) => [indentLines(input.text, indent)];
  const insert = input.place.into ? intoSplice(source, texts, input.place.into, input.closeTag(input.place.into)) : besideSplice(source, texts, ref, input.place.after !== undefined);
  return applyTracked(source, [insert, ...(input.extra ? [{ ...input.extra, marks: [] }] : [])]);
}

export function outermost(nodes: StructNode[]): StructNode[] {
  const unique = [...new Map(nodes.map((node) => [node.start, node])).values()].sort((a, b) => a.start - b.start);
  return unique.filter((node) => !unique.some((other) => other !== node && contains(other, node)));
}

export function planStructure(source: string, input: OpInput): OpPlan {
  const nodes = input.op === 'wrap' ? [...input.nodes].sort((a, b) => a.start - b.start) : outermost(input.nodes);
  if (input.op === 'delete') return applyTracked(source, deleteOp(source, nodes));
  if (input.op === 'duplicate') return applyTracked(source, duplicateOp(source, nodes));
  if (input.op === 'wrap') return applyTracked(source, wrapOp(source, nodes, input.frame));
  if (input.op === 'unwrap') return applyTracked(source, unwrapOp(source, nodes));
  return applyTracked(source, moveOp(source, nodes, input.place, input.closeTag));
}

export function positionAt(code: string, offset: number): { line: number; col: number } {
  const start = lineStart(code, offset);
  let line = 1;
  for (let index = code.indexOf('\n'); index >= 0 && index < offset; index = code.indexOf('\n', index + 1)) line += 1;
  return { line, col: offset - start + 1 };
}
