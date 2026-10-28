import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Project, SourceLoc, TailwindOutcome } from '../../shared/contracts.js';
import { DEFAULT_BREAKPOINTS, normalizeVariant, type Breakpoint, type VariantSupport } from '../../shared/variants.js';
import { htmlClassInfo, htmlVariantProps } from './html.js';
import { resolveSource, themeForFile } from './index.js';
import { jsxClassInfo } from './jsx.js';
import { classify, parseClass } from './tailwind/classes.js';
import { classProps } from './tailwind/map.js';
import type { TailwindTheme } from './tailwind/theme.js';

export interface ElementClassInfo {
  tailwind: TailwindOutcome | null;
  variants: VariantSupport;
}

const NO_TAILWIND = 'This file does not use Tailwind, so breakpoint and state edits are off. Ask the agent to add a media query or :hover rule.';

function breakpointsOf(theme: TailwindTheme): Breakpoint[] {
  return [...theme.breakpoints.entries()].map(([name, px]) => ({ name, px })).sort((a, b) => a.px - b.px);
}

function variantClasses(classes: string[], variant: string, theme: TailwindTheme): Pick<VariantSupport, 'props' | 'set'> {
  const props = new Set<string>();
  const set: string[] = [];
  for (const token of classes) {
    const parsed = parseClass(token);
    if (parsed.variants !== variant) continue;
    set.push(token);
    const cls = classify(parsed, theme);
    if (cls) for (const prop of classProps(cls)) props.add(prop);
  }
  return { props: [...props], set };
}

function classSupport(tailwind: TailwindOutcome | null, theme: TailwindTheme, variant: string): VariantSupport {
  const breakpoints = breakpointsOf(theme);
  if (!tailwind || tailwind.mode !== 'classes') return { mode: 'none', reason: tailwind?.note ?? 'The class list of this element cannot be edited.', breakpoints, props: [], set: [] };
  return { mode: 'classes', reason: null, breakpoints, ...(variant ? variantClasses(tailwind.classes, variant, theme) : { props: [], set: [] }) };
}

export async function elementClassInfo(workTree: string, projectKind: Project['kind'], loc: SourceLoc, rawVariant = ''): Promise<ElementClassInfo> {
  const target = await resolveSource(workTree, loc.file);
  const code = await readFile(target.file, 'utf8');
  const theme = await themeForFile(workTree, target.relative, code, { projectKind });
  const extension = path.extname(target.relative).toLowerCase();
  const position = { line: loc.line, col: loc.col };
  const html = extension === '.html' || extension === '.htm';
  const variant = normalizeVariant(rawVariant) ?? '';
  const tailwind = html ? htmlClassInfo(code, position, theme) : jsxClassInfo(code, position, extension === '.tsx', theme);
  if (theme) return { tailwind, variants: classSupport(tailwind, theme, variant) };
  if (html) {
    const decls = variant ? htmlVariantProps(code, position, variant) : [];
    return { tailwind, variants: { mode: 'css', reason: null, breakpoints: [...DEFAULT_BREAKPOINTS], props: decls.map((entry) => entry.prop), set: decls.map((entry) => `${entry.prop}: ${entry.value}`) } };
  }
  return { tailwind, variants: { mode: 'none', reason: NO_TAILWIND, breakpoints: [...DEFAULT_BREAKPOINTS], props: [], set: [] } };
}
