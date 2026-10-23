import { parse } from '@babel/parser';
import type { ParserPlugin } from '@babel/parser';
import MagicString from 'magic-string';
import type { SourceMap } from 'magic-string';
import { SOURCE_LOC_ATTR } from '../../shared/contracts.js';

interface AstNode {
  type: string;
  start?: number | null;
  end?: number | null;
  loc?: { start: { line: number; column: number } } | null;
  [key: string]: unknown;
}

interface SourceTagResult {
  code: string;
  map: SourceMap;
}

function isAstNode(value: unknown): value is AstNode {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function walk(node: AstNode, visit: (node: AstNode) => void): void {
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) if (isAstNode(item)) walk(item, visit);
    } else if (isAstNode(value)) {
      walk(value, visit);
    }
  }
}

function hasLocAttribute(opening: AstNode): boolean {
  const attributes = opening.attributes;
  if (!Array.isArray(attributes)) return false;
  return attributes.some((attr: unknown) => {
    if (!isAstNode(attr) || attr.type !== 'JSXAttribute') return false;
    const name = attr.name;
    return isAstNode(name) && name.type === 'JSXIdentifier' && name.name === SOURCE_LOC_ATTR;
  });
}

function isHostElementName(name: unknown): name is AstNode & { name: string } {
  return isAstNode(name) && name.type === 'JSXIdentifier' && typeof name.name === 'string' && /^[a-z]/.test(name.name);
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function tagJsxSource(code: string, id: string, relPath: string): SourceTagResult | null {
  const plugins: ParserPlugin[] = /\.tsx$/i.test(id) ? ['jsx', 'typescript'] : ['jsx'];
  let ast: unknown;
  try {
    ast = parse(code, { sourceType: 'module', plugins, errorRecovery: false });
  } catch {
    return null;
  }
  if (!isAstNode(ast)) return null;
  const magic = new MagicString(code);
  let changed = false;
  walk(ast, (node) => {
    if (node.type !== 'JSXOpeningElement') return;
    const name = node.name;
    if (!isHostElementName(name)) return;
    if (hasLocAttribute(node)) return;
    const insertAt = name.end;
    const start = node.loc?.start;
    if (typeof insertAt !== 'number' || !start) return;
    const loc = `${relPath}:${start.line}:${start.column + 1}`;
    magic.appendLeft(insertAt, ` ${SOURCE_LOC_ATTR}="${escapeAttr(loc)}"`);
    changed = true;
  });
  if (!changed) return null;
  return {
    code: magic.toString(),
    map: magic.generateMap({ hires: true, source: id, includeContent: true }),
  };
}
