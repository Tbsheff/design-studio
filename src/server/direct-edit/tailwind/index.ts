import type { ClassChange, TailwindOutcome } from '../../../shared/contracts.js';
import { DirectEditError } from '../errors.js';
import { cssEdits, isMappedProperty } from './map.js';
import { ClassEditError, planClassEdit, siteClasses, type ClassEdit, type ClassPlan, type ClassSite } from './plan.js';
import type { TailwindTheme } from './theme.js';

export type { TailwindTheme } from './theme.js';

export interface ClassPatch {
  plan: ClassPlan;
  outcome: TailwindOutcome;
  inlineProps: string[];
}

export interface InlineFallback {
  outcome: TailwindOutcome;
}

function isVisibilityToggle(style: Record<string, string | null>): boolean {
  const keys = Object.keys(style);
  return keys.length === 1 && keys[0] === 'display' && (style.display === 'none' || style.display === null);
}

function styleEdits(style: Record<string, string | null>, theme: TailwindTheme): { edits: ClassEdit[]; unmapped: string[] } {
  const edits: ClassEdit[] = [];
  const unmapped: string[] = [];
  for (const [prop, value] of Object.entries(style)) {
    const mapped = isMappedProperty(prop) ? cssEdits(prop, value, theme) : null;
    if (!mapped) unmapped.push(prop);
    else edits.push(...mapped.map((edit) => ({ ...edit, variants: '' })));
  }
  return { edits, unmapped };
}

function classOps(classes: ClassChange | undefined): ClassEdit[] {
  return [...(classes?.remove ?? []).map((token) => ({ kind: 'remove' as const, token })), ...(classes?.add ?? []).map((token) => ({ kind: 'add' as const, token }))];
}

function outcome(mode: TailwindOutcome['mode'], classes: string[], dynamic: boolean, notes: string[]): TailwindOutcome {
  return { mode, classes, dynamic, note: notes.length > 0 ? notes.join(' ') : null };
}

export type ClassDecision = { kind: 'classes'; patch: ClassPatch } | { kind: 'inline'; fallback: InlineFallback } | { kind: 'none' };

export function decideClassEdit(site: () => ClassSite, style: Record<string, string | null>, classes: ClassChange | undefined, theme: TailwindTheme | null): ClassDecision {
  const explicit = classOps(classes);
  const styled = theme && Object.keys(style).length > 0 && !isVisibilityToggle(style);
  if (!styled && explicit.length === 0) return { kind: 'none' };
  const resolved = site();
  const fromStyle = styled && theme ? styleEdits(style, theme) : { edits: [], unmapped: Object.keys(style) };
  if (resolved.unsafe) {
    if (explicit.length > 0) throw new DirectEditError('classes_not_editable', `${resolved.unsafe}, so classes cannot be edited here`);
    return { kind: 'inline', fallback: { outcome: outcome('inline', siteClasses(resolved), resolved.dynamic, [`${resolved.unsafe}, so this edit went to inline style.`]) } };
  }
  try {
    const plan = planClassEdit(resolved, [...fromStyle.edits, ...explicit], theme);
    const inlineProps = styled ? Object.keys(style).filter((prop) => !fromStyle.unmapped.includes(prop)) : [];
    return { kind: 'classes', patch: { plan, outcome: outcome('classes', plan.classes, resolved.dynamic, plan.notes), inlineProps } };
  } catch (error) {
    if (!(error instanceof ClassEditError)) throw error;
    if (explicit.length > 0) throw new DirectEditError('classes_not_editable', error.message);
    return { kind: 'inline', fallback: { outcome: outcome('inline', siteClasses(resolved), resolved.dynamic, [`${error.message}, so this edit went to inline style.`]) } };
  }
}

export function describeSite(site: ClassSite, theme: TailwindTheme | null): TailwindOutcome {
  if (!theme) return outcome('none', siteClasses(site), site.dynamic, []);
  if (site.unsafe) return outcome('inline', siteClasses(site), site.dynamic, [`${site.unsafe}, so edits go to inline style.`]);
  return outcome('classes', siteClasses(site), site.dynamic, []);
}
