import type * as t from '@babel/types';
import { parseModuleFile } from './props-schema.js';

function stillUsed(code: string, ast: t.File, name: string): boolean {
  let text = code;
  for (const statement of [...ast.program.body].reverse()) if (statement.type === 'ImportDeclaration') text = text.slice(0, statement.start ?? 0) + text.slice(statement.end ?? 0);
  return new RegExp(`(^|[^\\w$.])${name.replace(/\$/g, '\\$')}(?![\\w$])`).test(text);
}

function specifierRange(code: string, statement: t.ImportDeclaration, index: number): { start: number; end: number } {
  if (statement.specifiers.length === 1) {
    const end = statement.end ?? 0;
    return { start: statement.start ?? 0, end: code[end] === '\n' ? end + 1 : end };
  }
  const item = statement.specifiers[index] as t.Node;
  const next = statement.specifiers[index + 1];
  if (next) return { start: item.start ?? 0, end: next.start ?? 0 };
  return { start: statement.specifiers[index - 1]?.end ?? 0, end: item.end ?? 0 };
}

export function removeImport(code: string, name: string, file: string): string {
  if (name === 'React') return code;
  const ast = parseModuleFile(code, file);
  if (!ast || stillUsed(code, ast, name)) return code;
  for (const statement of ast.program.body) {
    if (statement.type !== 'ImportDeclaration') continue;
    const index = statement.specifiers.findIndex((item) => item.local.name === name);
    if (index < 0) continue;
    const range = specifierRange(code, statement, index);
    return code.slice(0, range.start) + code.slice(range.end);
  }
  return code;
}
