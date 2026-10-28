import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import type * as t from '@babel/types';
import MagicString from 'magic-string';
import { z } from 'zod';
import { DIRECT_STYLE_PROPERTIES, type Direction, type Project, type Version } from '../../shared/contracts.js';
import { PROP_NAME, PROP_TEXT_MAX, PROPS_MAX, type ComponentInstance, type ComponentSchema, type PropValue, type SetPropsResult, type VariantClassResult } from '../../shared/props.js';
import { cvaCalls, parseModuleFile } from '../components/props-schema.js';
import { sourceFiles, usesIn } from '../components/props-service.js';
import { elementAt, readInstance } from '../components/use-site.js';
import { DirectEditError } from './errors.js';
import { assertCanEdit, publishVersion, resolveSource, themeForFile, writeAtomic, type DirectEditDeps, type ResolvedSource } from './index.js';
import { parseSource } from './jsx.js';
import { applySplices } from './splice.js';
import { decideClassEdit } from './tailwind/index.js';
import type { ClassSite } from './tailwind/plan.js';

const RESERVED = new Set(['className', 'class', 'style', 'children', 'key', 'ref', 'dangerouslySetInnerHTML']);
const loc = z.object({ file: z.string().trim().min(1).max(1000), line: z.number().int().min(1), col: z.number().int().min(1) }).strict();
const propValue = z.union([z.string().max(PROP_TEXT_MAX).refine((value) => !/[\u0000-\u0008\u000b-\u001f]/.test(value), 'control characters are not allowed'), z.number().finite(), z.boolean(), z.null()]);
const propName = z.string().regex(PROP_NAME, 'must be a prop name').refine((name) => !RESERVED.has(name), 'this prop is not edited here');

export const setPropsSchema = z.object({ source: loc, props: z.record(propName, propValue).refine((props) => { const count = Object.keys(props).length; return count > 0 && count <= PROPS_MAX; }, `pass 1 to ${PROPS_MAX} props`) }).strict();

const styleValue = z.string().max(200).nullable();
const classNames = z.array(z.string().trim().min(1).max(100)).max(30);
export const variantClassSchema = z
  .object({
    file: z.string().trim().min(1).max(1000),
    cva: z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/),
    prop: z.string().min(1).max(64),
    value: z.string().min(1).max(64),
    style: z.object(Object.fromEntries(DIRECT_STYLE_PROPERTIES.map((prop) => [prop, styleValue.optional()]))).strict().optional(),
    classes: z.object({ add: classNames.optional(), remove: classNames.optional() }).strict().optional(),
  })
  .strict();

export type SetProps = z.output<typeof setPropsSchema>;
export type VariantClassEdit = z.output<typeof variantClassSchema>;

function invalid(error: z.ZodError): DirectEditError {
  const issue = error.issues[0];
  return new DirectEditError('invalid_request', issue ? `${issue.path.join('.') || 'request'}: ${issue.message}` : 'The request is not valid');
}

export function parseSetProps(raw: unknown): SetProps {
  const parsed = setPropsSchema.safeParse(raw);
  if (!parsed.success) throw invalid(parsed.error);
  return parsed.data;
}

export function parseVariantClassEdit(raw: unknown): VariantClassEdit {
  const parsed = variantClassSchema.safeParse(raw);
  if (!parsed.success) throw invalid(parsed.error);
  return parsed.data;
}

function rangeOf(node: t.Node): { start: number; end: number } {
  if (typeof node.start !== 'number' || typeof node.end !== 'number') throw new DirectEditError('parse_failed', 'Missing source position');
  return { start: node.start, end: node.end };
}

function attrName(attribute: t.JSXAttribute): string {
  return attribute.name.type === 'JSXIdentifier' ? attribute.name.name : `${attribute.name.namespace.name}:${attribute.name.name.name}`;
}

function isLiteral(attribute: t.JSXAttribute): boolean {
  const value = attribute.value;
  if (!value || value.type === 'StringLiteral') return true;
  if (value.type !== 'JSXExpressionContainer') return false;
  const expression = value.expression;
  return expression.type === 'StringLiteral' || expression.type === 'NumericLiteral' || expression.type === 'BooleanLiteral' || (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) || (expression.type === 'UnaryExpression' && expression.argument.type === 'NumericLiteral');
}

function quoteOf(source: string, element: t.JSXElement): string {
  for (const attribute of element.openingElement.attributes) {
    if (attribute.type === 'JSXAttribute' && attribute.value?.type === 'StringLiteral') return source[rangeOf(attribute.value).start] === "'" ? "'" : '"';
  }
  return /=\s*'/.test(source) && !/=\s*"/.test(source) ? "'" : '"';
}

function attributeText(name: string, value: PropValue, quote: string): string {
  if (value === true) return name;
  if (typeof value === 'number' || typeof value === 'boolean') return `${name}={${String(value)}}`;
  if (!value.includes(quote) && !/[\n\r\\]/.test(value) && !/[{}<>]/.test(value)) return `${name}=${quote}${value}${quote}`;
  return `${name}={${JSON.stringify(value)}}`;
}

function lineStart(source: string, offset: number): number {
  return source.lastIndexOf('\n', offset - 1) + 1;
}

function removalRange(source: string, attribute: t.JSXAttribute): { start: number; end: number } {
  const { start, end } = rangeOf(attribute);
  const before = lineStart(source, start);
  const newline = source.indexOf('\n', end);
  const after = newline === -1 ? source.length : newline;
  if (/^[ \t]*$/.test(source.slice(before, start)) && /^[ \t]*$/.test(source.slice(end, after)) && newline !== -1) return { start: before, end: newline + 1 };
  let from = start;
  while (from > 0 && /[ \t]/.test(source[from - 1] ?? '')) from -= 1;
  return { start: from, end };
}

function insertion(source: string, element: t.JSXElement, text: string): { at: number; text: string } {
  const opening = element.openingElement;
  const attributes = opening.attributes;
  const last = attributes.at(-1);
  if (!last) return { at: rangeOf(opening.name).end, text: ` ${text}` };
  const lastStart = rangeOf(last).start;
  const previousEnd = attributes.length > 1 ? rangeOf(attributes[attributes.length - 2] as t.Node).end : rangeOf(opening.name).end;
  if (source.slice(previousEnd, lastStart).includes('\n')) {
    const indent = /^[ \t]*/.exec(source.slice(lineStart(source, lastStart), lastStart))?.[0] ?? '';
    return { at: rangeOf(last).end, text: `\n${indent}${text}` };
  }
  return { at: rangeOf(last).end, text: ` ${text}` };
}

function sameValue(a: PropValue | undefined, b: PropValue | undefined): boolean {
  return a !== undefined && b !== undefined && String(a) === String(b);
}

function checkValue(schema: ComponentSchema | null, name: string, value: PropValue | null): void {
  const spec = schema?.props.find((prop) => prop.name === name);
  if (!spec || value === null) return;
  if (spec.control === 'select' && spec.options && !spec.options.includes(String(value))) {
    throw new DirectEditError('invalid_request', `${name} must be one of: ${spec.options.join(', ')}`);
  }
  if (spec.control === 'boolean' && typeof value !== 'boolean') throw new DirectEditError('invalid_request', `${name} takes true or false`);
  if (spec.control === 'number' && typeof value !== 'number') throw new DirectEditError('invalid_request', `${name} takes a number`);
}

export interface PropsPlan {
  code: string;
  changed: string[];
  removed: string[];
}

interface PropsPatch {
  source: string;
  element: t.JSXElement;
  quote: string;
  magic: MagicString;
  additions: string[];
}

function targetValue(schema: ComponentSchema | null, name: string, raw: PropValue | null): PropValue | null {
  checkValue(schema, name, raw);
  const spec = schema?.props.find((prop) => prop.name === name);
  const unset = sameValue(raw ?? undefined, spec?.default) || (raw === false && spec?.control === 'boolean' && spec.default === undefined);
  return unset ? null : raw;
}

function patchProp(patch: PropsPatch, name: string, value: PropValue | null): 'changed' | 'removed' | null {
  const attribute = patch.element.openingElement.attributes.find((item): item is t.JSXAttribute => item.type === 'JSXAttribute' && attrName(item) === name);
  if (attribute && !isLiteral(attribute)) throw new DirectEditError('attribute_not_literal', `${name} is set by an expression here, so it is not changed from the inspector`);
  if (value === null) {
    if (!attribute) return null;
    const range = removalRange(patch.source, attribute);
    patch.magic.remove(range.start, range.end);
    return 'removed';
  }
  const text = attributeText(name, value, patch.quote);
  if (!attribute) {
    patch.additions.push(text);
    return 'changed';
  }
  const range = rangeOf(attribute);
  if (patch.source.slice(range.start, range.end) === text) return null;
  patch.magic.overwrite(range.start, range.end, text);
  return 'changed';
}

export function planPropsEdit(source: string, relative: string, instance: ComponentInstance, props: Record<string, PropValue | null>): PropsPlan {
  const typescript = path.extname(relative).toLowerCase() === '.tsx';
  const element = elementAt(parseSource(source, typescript), instance.use.line, instance.use.col);
  if (!element) throw new DirectEditError('element_not_found', 'The component is no longer at this place in the file; select it again');
  const patch: PropsPatch = { source, element, quote: quoteOf(source, element), magic: new MagicString(source), additions: [] };
  const changed: string[] = [];
  const removed: string[] = [];
  for (const [name, raw] of Object.entries(props)) {
    const outcome = patchProp(patch, name, targetValue(instance.component, name, raw));
    if (outcome === 'changed') changed.push(name);
    else if (outcome === 'removed') removed.push(name);
  }
  for (const text of patch.additions) {
    const at = insertion(source, element, text);
    patch.magic.appendLeft(at.at, at.text);
  }
  const code = patch.magic.toString();
  if (code !== source) parseSource(code, typescript);
  return { code, changed, removed };
}

function valueWords(props: Record<string, PropValue | null>): string {
  const entries = Object.entries(props);
  if (entries.length === 1) {
    const [name, value] = entries[0] as [string, PropValue | null];
    return value === null ? `remove ${name}` : `${name} to ${String(value)}`;
  }
  return entries.map(([name]) => name).join(', ');
}

function propsTitle(tag: string, plan: PropsPlan, props: Record<string, PropValue | null>): string {
  if (plan.changed.length === 0 && plan.removed.length > 0) return `Reset ${tag} ${plan.removed.join(', ')}`;
  return `Set ${tag} ${valueWords(props)}`;
}

async function commitChange(deps: DirectEditDeps, project: Project, direction: Direction, target: ResolvedSource, before: string, after: string, title: string, prompt: string): Promise<Version> {
  await writeAtomic(target.file, after);
  let version: Version | null;
  try {
    version = await deps.versions.commitFile(project, direction, target.relative, title, { kind: 'manual', prompt });
  } catch (error) {
    await writeAtomic(target.file, before);
    throw error;
  }
  if (version === null) {
    await writeAtomic(target.file, before);
    throw new DirectEditError('no_change', 'The edit did not change any tracked file');
  }
  deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files: [{ file: target.file, relative: target.relative, before, after }] });
  await publishVersion(deps, project, direction, version);
  return version;
}

export async function planSetProps(workTree: string, request: SetProps): Promise<{ target: ResolvedSource; original: string; instance: ComponentInstance; plan: PropsPlan }> {
  const target = await resolveSource(workTree, request.source.file);
  const original = await readFile(target.file, 'utf8');
  const instance = await readInstance(workTree, { ...request.source, file: target.relative });
  if (!instance) throw new DirectEditError('element_not_found', `No component element at ${request.source.file}:${request.source.line}:${request.source.col}`);
  return { target, original, instance, plan: planPropsEdit(original, target.relative, instance, request.props) };
}

export async function applySetProps(deps: DirectEditDeps, project: Project, direction: Direction, raw: unknown): Promise<SetPropsResult> {
  const request = parseSetProps(raw);
  const head = assertCanEdit(deps, project, direction);
  const { target, original, instance, plan } = await planSetProps(direction.workTree, request);
  if (plan.code === original) return { file: target.relative, version: await deps.versions.get(project, head), changed: [], removed: [], instance };
  const summary = Object.entries(request.props).map(([name, value]) => (value === null ? `remove ${name}` : `${name}=${JSON.stringify(value)}`)).join('; ');
  const version = await commitChange(deps, project, direction, target, original, plan.code, propsTitle(instance.tag, plan, request.props), `Props of <${instance.tag}> at ${target.relative}:${instance.use.line}: ${summary}`);
  return { file: target.relative, version, changed: plan.changed, removed: plan.removed, instance: await readInstance(direction.workTree, instance.use, usesIn(await sourceFiles(direction.workTree))) };
}

function variantLiteral(ast: t.File, edit: VariantClassEdit): t.StringLiteral {
  const call = cvaCalls(ast).find((entry) => entry.info.name === edit.cva);
  if (!call) throw new DirectEditError('element_not_found', `No cva() named ${edit.cva} in ${edit.file}`);
  const config = call.node.arguments[1];
  const variants = config?.type === 'ObjectExpression' ? config.properties.find((item): item is t.ObjectProperty => item.type === 'ObjectProperty' && !item.computed && ((item.key.type === 'Identifier' && item.key.name === 'variants') || (item.key.type === 'StringLiteral' && item.key.value === 'variants'))) : undefined;
  const group = variants?.value.type === 'ObjectExpression' ? variants.value.properties.find((item): item is t.ObjectProperty => item.type === 'ObjectProperty' && !item.computed && keyText(item.key) === edit.prop) : undefined;
  const option = group?.value.type === 'ObjectExpression' ? group.value.properties.find((item): item is t.ObjectProperty => item.type === 'ObjectProperty' && !item.computed && keyText(item.key) === edit.value) : undefined;
  if (!option) throw new DirectEditError('element_not_found', `${edit.cva} has no ${edit.prop} variant "${edit.value}"`);
  if (option.value.type !== 'StringLiteral') throw new DirectEditError('classes_not_editable', `The ${edit.value} ${edit.prop} classes are not a plain string, so they are not edited here`);
  return option.value;
}

function keyText(key: t.Node): string | null {
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'StringLiteral') return key.value;
  if (key.type === 'NumericLiteral') return String(key.value);
  return null;
}

function literalSite(source: string, literal: t.StringLiteral): ClassSite {
  const { start, end } = rangeOf(literal);
  const text = source.slice(start + 1, end - 1);
  const editable = !text.includes('\\');
  return { segments: [{ start: start + 1, end: end - 1, text, editable, direct: true, glueStart: false, glueEnd: false, quote: source[start] ?? '"', escape: 'js' }], dynamic: false, unsafe: editable ? null : 'The variant string has escapes', create: null };
}

export async function planVariantClasses(workTree: string, projectKind: Project['kind'], edit: VariantClassEdit): Promise<{ target: ResolvedSource; original: string; code: string; classes: string[]; note: string | null }> {
  if (!/\.(tsx|jsx)$/i.test(edit.file)) throw new DirectEditError('invalid_source', `${edit.file} is not a .tsx or .jsx file; cva() variants are edited only in component files`);
  const target = await resolveSource(workTree, edit.file);
  const original = await readFile(target.file, 'utf8');
  const ast = parseModuleFile(original, target.file);
  if (!ast) throw new DirectEditError('parse_failed', `${edit.file} could not be parsed`);
  const literal = variantLiteral(ast, edit);
  const theme = await themeForFile(await realpath(workTree), target.relative, original, { projectKind });
  const style = Object.fromEntries(Object.entries(edit.style ?? {}).filter((entry): entry is [string, string | null] => entry[1] !== undefined));
  const decision = decideClassEdit(() => literalSite(original, literal), style, edit.classes, theme);
  if (decision.kind === 'none') return { target, original, code: original, classes: literal.value.split(/\s+/).filter(Boolean), note: theme ? null : 'This project does not use Tailwind, so style values cannot become classes.' };
  if (decision.kind === 'inline') throw new DirectEditError('classes_not_editable', decision.fallback.outcome.note ?? 'These styles have no Tailwind class here');
  const code = applySplices(original, decision.patch.plan.splices);
  if (code !== original) parseSource(code, path.extname(target.relative).toLowerCase() === '.tsx');
  const unmapped = Object.keys(style).filter((prop) => !decision.patch.inlineProps.includes(prop));
  const notes = [...(decision.patch.outcome.note ? [decision.patch.outcome.note] : []), ...(unmapped.length > 0 ? [`No class for ${unmapped.join(', ')}.`] : [])];
  return { target, original, code, classes: decision.patch.plan.classes, note: notes.length > 0 ? notes.join(' ') : null };
}

export async function applyVariantClasses(deps: DirectEditDeps, project: Project, direction: Direction, raw: unknown): Promise<VariantClassResult> {
  const edit = parseVariantClassEdit(raw);
  const head = assertCanEdit(deps, project, direction);
  const plan = await planVariantClasses(direction.workTree, project.kind, edit);
  if (plan.code === plan.original) return { file: plan.target.relative, version: await deps.versions.get(project, head), classes: plan.classes, note: plan.note };
  const version = await commitChange(deps, project, direction, plan.target, plan.original, plan.code, `Edit ${edit.cva} ${edit.prop} ${edit.value} classes`, `Variant classes of ${edit.cva} ${edit.prop}=${edit.value} in ${plan.target.relative}: ${plan.classes.join(' ')}`);
  return { file: plan.target.relative, version, classes: plan.classes, note: plan.note };
}
