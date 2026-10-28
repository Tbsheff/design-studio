import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Project, SourceLoc, TailwindOutcome } from '../../shared/contracts.js';
import { htmlClassInfo } from './html.js';
import { resolveSource, themeForFile } from './index.js';
import { jsxClassInfo } from './jsx.js';

export async function elementClassInfo(workTree: string, projectKind: Project['kind'], loc: SourceLoc): Promise<TailwindOutcome | null> {
  const target = await resolveSource(workTree, loc.file);
  const code = await readFile(target.file, 'utf8');
  const theme = await themeForFile(workTree, target.relative, code, { projectKind });
  const extension = path.extname(target.relative).toLowerCase();
  const position = { line: loc.line, col: loc.col };
  if (extension === '.html' || extension === '.htm') return htmlClassInfo(code, position, theme);
  return jsxClassInfo(code, position, extension === '.tsx', theme);
}
