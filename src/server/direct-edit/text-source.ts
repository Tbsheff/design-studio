import { realpath } from 'node:fs/promises';
import type * as t from '@babel/types';
import MagicString from 'magic-string';
import type { SourceLoc, TextSourceHints, TextSourceInfo } from '../../shared/contracts.js';
import { ownerUseSite } from '../components/use-site.js';
import { dataExpression, findJsxElement, stringLiteral } from './jsx.js';
import { createModuleCache, type TextModule } from './text-source-files.js';
import { trace, unwrap, type Candidate, type TraceContext } from './text-trace.js';

export interface TextSourceScope {
  workTree: string;
  previewOrigin: string | null;
}

export interface TextSourceHit {
  info: TextSourceInfo;
  file: string;
  relative: string;
  original: string;
  write: (text: string) => string;
}

export type TextSourceLookup = { hit: TextSourceHit } | { reason: string };

const TRACE_BUDGET = 4000;
const MAX_LISTED = 3;

function normal(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function sameText(value: string, current: string): boolean {
  return normal(value) === normal(current);
}

function looseText(value: string, current: string): boolean {
  return normal(value).toLowerCase() === normal(current).toLowerCase();
}

function dedupe(found: Candidate[]): Candidate[] {
  const seen = new Map<string, Candidate>();
  for (const candidate of found) {
    const key = `${candidate.mod.file}:${candidate.node.start}`;
    const known = seen.get(key);
    seen.set(key, known ? { ...known, via: [...known.via, ...candidate.via] } : candidate);
  }
  return [...seen.values()];
}

function locText(candidate: Candidate): string {
  return `${candidate.mod.relative}:${candidate.node.loc?.start.line ?? 1}`;
}

function pick(found: Candidate[], current: string, uses: Set<string>): Candidate | Candidate[] {
  const exact = found.filter((candidate) => sameText(candidate.value, current));
  const matches = exact.length > 0 ? exact : found.filter((candidate) => looseText(candidate.value, current));
  if (matches.length <= 1) return matches[0] ?? [];
  const preferred = matches.filter((candidate) => candidate.via.some((key) => uses.has(key)));
  return preferred.length === 1 ? (preferred[0] as Candidate) : matches;
}

function accessorText(steps: (string | number)[]): string {
  return steps.map((step) => (typeof step === 'number' ? `[${step}]` : `.${step}`)).join('');
}

function chainOf(mod: TextModule, node: t.Node): { base: t.Node | null; steps: (string | number)[] } {
  const steps: (string | number)[] = [];
  let child: t.Node = node;
  for (let parent = mod.parents.get(node); parent; child = parent, parent = mod.parents.get(parent)) {
    if (parent.type === 'ObjectProperty' && parent.value === child) {
      const key = parent.key.type === 'Identifier' ? parent.key.name : parent.key.type === 'StringLiteral' ? parent.key.value : null;
      if (key === null) break;
      steps.unshift(key);
    } else if (parent.type === 'ArrayExpression') {
      steps.unshift(parent.elements.indexOf(child as t.Expression));
    } else if (parent.type !== 'ObjectExpression' && !parent.type.startsWith('TS')) {
      return { base: parent, steps };
    }
  }
  return { base: null, steps };
}

function attributeLabel(mod: TextModule, node: t.Node): string | null {
  const parent = mod.parents.get(node);
  const attribute = parent?.type === 'JSXExpressionContainer' ? mod.parents.get(parent) : parent;
  if (attribute?.type !== 'JSXAttribute' || attribute.name.type !== 'JSXIdentifier') return null;
  const opening = mod.parents.get(attribute);
  const tag = opening?.type === 'JSXOpeningElement' && opening.name.type === 'JSXIdentifier' ? opening.name.name : 'the component';
  return `the ${attribute.name.name} prop of <${tag}>`;
}

function defaultLabel(mod: TextModule, node: t.Node): { what: string; shared: string } | null {
  const parent = mod.parents.get(node);
  if (parent?.type !== 'AssignmentPattern' || parent.right !== node || parent.left.type !== 'Identifier') return null;
  const name = parent.left.name;
  return { what: `the default ${name}`, shared: `It changes every use that does not set ${name}.` };
}

function chainLabel(mod: TextModule, node: t.Node): string {
  const { base, steps } = chainOf(mod, node);
  if (mod.json) return steps.length > 0 ? `the message ${steps.join('.')}` : 'the message';
  const name = base?.type === 'VariableDeclarator' && base.id.type === 'Identifier' ? base.id.name : null;
  const last = steps.at(-1);
  if (typeof last === 'string') return `the ${last} in ${name ?? 'the list'}${accessorText(steps.slice(0, -1))}`;
  return name ? `${name}${accessorText(steps)}` : 'the text';
}

function describe(candidate: Candidate): TextSourceInfo {
  const { mod, node } = candidate;
  const fallback = defaultLabel(mod, node);
  const what = attributeLabel(mod, node) ?? fallback?.what ?? chainLabel(mod, node);
  return { file: mod.relative, line: node.loc?.start.line ?? 1, what, ...(fallback ? { shared: fallback.shared } : {}) };
}

function jsxAttributeText(text: string, quote: string): string {
  if (!text.includes(quote) && !/[\n\r]/.test(text)) return `${quote}${text}${quote}`;
  const other = quote === '"' ? "'" : '"';
  if (!text.includes(other) && !/[\n\r]/.test(text)) return `${other}${text}${other}`;
  return `{${JSON.stringify(text)}}`;
}

function templateText(text: string): string {
  return `\`${text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``;
}

function replacement(candidate: Candidate, text: string): string {
  const { mod, node } = candidate;
  if (mod.json) return JSON.stringify(text);
  if (node.type === 'TemplateLiteral') return templateText(text);
  const quote = mod.code[node.start ?? 0] === '"' ? '"' : "'";
  return mod.parents.get(node)?.type === 'JSXAttribute' ? jsxAttributeText(text, quote) : stringLiteral(text, quote);
}

function hitOf(candidate: Candidate): TextSourceHit {
  const { mod, node } = candidate;
  return {
    info: describe(candidate),
    file: mod.file,
    relative: mod.relative,
    original: mod.code,
    write: (text) => {
      const magic = new MagicString(mod.code);
      magic.overwrite(node.start ?? 0, node.end ?? 0, replacement(candidate, text));
      return magic.toString();
    },
  };
}

async function useKeys(scope: TextSourceScope, root: string, hints: TextSourceHints): Promise<Set<string>> {
  const keys = new Set<string>();
  const add = (loc: SourceLoc | null | undefined) => loc && keys.add(`${loc.file}:${loc.line}`);
  add(hints.usedAt);
  for (const owner of hints.owners ?? []) add(await ownerUseSite(scope, root, owner).catch(() => null));
  return keys;
}

function stuckReason(ctx: TraceContext): string {
  if (!ctx.stuck) return 'The studio could not find where it is set.';
  return `It is set when the page runs (${ctx.stuck.text} in ${ctx.stuck.file}:${ctx.stuck.line}), so there is no text in the source to change.`;
}

function mismatchReason(found: Candidate[]): string {
  const listed = found.slice(0, MAX_LISTED).map(locText).join(', ');
  return `The text on the page is not the text in the source (${listed}). It may change when the page runs.`;
}

export async function findTextSource(scope: TextSourceScope, loc: SourceLoc, hints: TextSourceHints | null): Promise<TextSourceLookup> {
  const root = await realpath(scope.workTree);
  const load = createModuleCache(root);
  const mod = await load(loc.file);
  const element = mod && mod.ast.type === 'File' ? findJsxElement(mod.ast.program, { line: loc.line, col: loc.col }) : null;
  const expression = element ? dataExpression(element) : null;
  if (!mod || !expression) return { reason: 'This text is not one expression.' };
  const ctx: TraceContext = { root, load, budget: TRACE_BUDGET, hops: 0, stuck: null };
  const found = dedupe(await trace(ctx, mod, unwrap(expression), []));
  if (!hints) return found.length === 1 ? { hit: hitOf(found[0] as Candidate) } : { reason: found.length > 1 ? `This text may come from ${found.length} places.` : stuckReason(ctx) };
  const chosen = pick(found, hints.text, await useKeys(scope, root, hints));
  if (!Array.isArray(chosen)) return { hit: hitOf(chosen) };
  if (chosen.length > 1) return { reason: `This text is in ${chosen.length} places (${chosen.slice(0, MAX_LISTED).map(locText).join(', ')}), so the studio cannot tell which one to change.` };
  return { reason: found.length > 0 ? mismatchReason(found) : stuckReason(ctx) };
}
