import type { DirectEditRequest, DirectStyleProperty, SelectionContext } from '../shared/contracts';
import { changedProps, shiftedValue, valuesFromStyles, type Shift, type StyleValues } from './cssValues';
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

export type { Shift };

export type Shifts = Partial<Record<DirectStyleProperty, Shift>>;

export function shiftedStyle(base: StyleValues, shifts: Shifts): Partial<StyleValues> {
  const style: Partial<StyleValues> = {};
  for (const [prop, shift] of Object.entries(shifts) as [DirectStyleProperty, Shift][]) {
    const next = shiftedValue(base[prop], shift);
    if (next !== null) style[prop] = next;
  }
  return changedProps(style, base);
}

export function addShift(shifts: Shifts, props: readonly DirectStyleProperty[], delta: number, bounds: Omit<Shift, 'delta'>): Shifts {
  const next = { ...shifts };
  for (const prop of props) next[prop] = { ...bounds, delta: (next[prop]?.delta ?? 0) + delta };
  return next;
}

export function withoutShifts(shifts: Shifts, props: readonly string[], sent?: Shifts): Shifts {
  const next = { ...shifts };
  for (const prop of props as DirectStyleProperty[]) delete next[prop];
  for (const [prop, done] of Object.entries(sent ?? {}) as [DirectStyleProperty, Shift][]) {
    const left = (next[prop]?.delta ?? 0) - done.delta;
    if (next[prop] && left !== 0) next[prop] = { ...next[prop], delta: left };
    else delete next[prop];
  }
  return next;
}

export interface OwnEdit {
  edit: DirectEditRequest;
  style: Partial<StyleValues>;
}

export function ownEdits(selections: SelectionContext[], bases: StyleValues[], style: Partial<StyleValues>, shifts: Shifts = {}): OwnEdit[] {
  const out: OwnEdit[] = [];
  selections.forEach((selection, i) => {
    const base = bases[i] ?? valuesFromStyles(selection.styles);
    const own = { ...changedProps(style, base), ...shiftedStyle(base, shifts) };
    const edit = buildEditRequest(selection, own);
    if (edit) out.push({ edit, style: own });
  });
  return out;
}

export function batchEdits(selections: SelectionContext[], bases: StyleValues[], style: Partial<StyleValues>): DirectEditRequest[] {
  return ownEdits(selections, bases, style).map((item) => item.edit);
}

export function dependsOnCurrent(raw: string, unit: string): boolean {
  return resolveNumberInput(raw, `0${unit}`, unit) !== resolveNumberInput(raw, `1${unit}`, unit);
}
