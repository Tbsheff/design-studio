import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ElementSourceInfo, Project, SourceLoc, TailwindOutcome } from '../../shared/contracts.js';
import { htmlClassInfo } from './html.js';
import { resolveSource, themeForFile } from './index.js';
import { jsxClassInfo, jsxElementInfo } from './jsx.js';

export interface ElementClassInfo {
  tailwind: TailwindOutcome | null;
  element: ElementSourceInfo | null;
}

export async function elementClassInfo(workTree: string, projectKind: Project['kind'], loc: SourceLoc): Promise<ElementClassInfo> {
  const target = await resolveSource(workTree, loc.file);
  const code = await readFile(target.file, 'utf8');
  const theme = await themeForFile(workTree, target.relative, code, { projectKind });
  const extension = path.extname(target.relative).toLowerCase();
  const position = { line: loc.line, col: loc.col };
  if (extension === '.html' || extension === '.htm') return { tailwind: htmlClassInfo(code, position, theme), element: null };
  const typescript = extension === '.tsx';
  return { tailwind: jsxClassInfo(code, position, typescript, theme), element: jsxElementInfo(code, position, typescript, target.relative) };
}
