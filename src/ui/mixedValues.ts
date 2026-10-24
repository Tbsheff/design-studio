import type { DirectEditRequest, DirectStyleProperty, SelectionContext } from '../shared/contracts';
import { changedProps, valuesFromStyles, type StyleValues } from './cssValues';
import { resolveNumberInput } from './mathInput';
import { buildEditRequest } from './useDirectEdit';

export const MAX_MULTI_EDIT = 50;

export interface MergedValues {
  values: StyleValues;
  mixed: ReadonlySet<DirectStyleProperty>;
}

const ALL_PROPS = Object.keys(valuesFromStyles({})) as DirectStyleProperty[];

export function mergeValues(list: StyleValues[]): MergedValues {
  const first = list[0] ?? valuesFromStyles({});
  const values = { ...first };
  const mixed = new Set<DirectStyleProperty>();
  for (const prop of ALL_PROPS) {
    if (list.some((v) => v[prop] !== first[prop])) {
      values[prop] = '';
      mixed.add(prop);
    }
  }
  return { values, mixed };
}

function locKey(selection: SelectionContext): string | null {
  const s = selection.source;
  return s ? `${s.file}:${s.line}:${s.col}` : null;
}

export function multiBlockReason(selections: SelectionContext[]): string | null {
  if (selections.length > MAX_MULTI_EDIT) return `Select ${MAX_MULTI_EDIT} elements or fewer to edit them together.`;
  if (selections.some((s) => !s.source)) return 'Some elements have no source location. Ask the agent to change them in Chat.';
  const keys = selections.map(locKey);
  if (new Set(keys).size !== keys.length) return 'Some elements come from one line of code, such as a list. Select one of them, or ask the agent in Chat.';
  return null;
}

export function batchEdits(selections: SelectionContext[], bases: StyleValues[], style: Partial<StyleValues>): DirectEditRequest[] {
  const edits: DirectEditRequest[] = [];
  selections.forEach((selection, i) => {
    const own = changedProps(style, bases[i] ?? valuesFromStyles(selection.styles));
    const req = buildEditRequest(selection, own);
    if (req) edits.push(req);
  });
  return edits;
}

export function dependsOnCurrent(raw: string, unit: string): boolean {
  return resolveNumberInput(raw, `0${unit}`, unit) !== resolveNumberInput(raw, `1${unit}`, unit);
}
