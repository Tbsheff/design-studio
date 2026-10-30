import type { DirectEditRequest, DirectStyleProperty, SelectionContext } from '../shared/contracts';
import { changedProps, shiftedPart, shiftedValue, valuesFromStyles, type Shift, type ShiftPart, type StyleValues } from './cssValues';
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

export type { Shift, ShiftPart };

export interface PartShift extends Shift {
  part: ShiftPart;
}

export interface PropShift extends Shift {
  parts?: Record<string, PartShift>;
}

export type Shifts = Partial<Record<DirectStyleProperty, PropShift>>;

function shiftedProp(raw: string, shift: PropShift): string | null {
  let value = shift.delta === 0 ? raw : shiftedValue(raw, shift);
  if (value === null) return null;
  for (const part of Object.values(shift.parts ?? {})) value = shiftedPart(value, part.part, part);
  return value;
}

export function shiftedStyle(base: StyleValues, shifts: Shifts): Partial<StyleValues> {
  const style: Partial<StyleValues> = {};
  for (const [prop, shift] of Object.entries(shifts) as [DirectStyleProperty, PropShift][]) {
    const next = shiftedProp(base[prop], shift);
    if (next !== null) style[prop] = next;
  }
  return changedProps(style, base);
}

function withPart(prev: PropShift | undefined, part: ShiftPart, delta: number, bounds: Omit<Shift, 'delta'>): PropShift {
  const parts = { ...prev?.parts };
  const old = parts[part.key];
  delete parts[part.key];
  const set = part.set ?? old?.part.set;
  parts[part.key] = { ...bounds, delta: part.set === undefined ? (old?.delta ?? 0) + delta : 0, part: { ...part, ...(set === undefined ? {} : { set }) } };
  return { delta: prev?.delta ?? 0, min: prev?.min, max: prev?.max, parts };
}

export function addShift(shifts: Shifts, props: readonly DirectStyleProperty[], delta: number, bounds: Omit<Shift, 'delta'>, part?: ShiftPart): Shifts {
  const next = { ...shifts };
  for (const prop of props) next[prop] = part ? withPart(next[prop], part, delta, bounds) : { ...next[prop], ...bounds, delta: (next[prop]?.delta ?? 0) + delta };
  return next;
}

function leftParts(cur: PropShift, done: PropShift): Record<string, PartShift> {
  const parts: Record<string, PartShift> = {};
  for (const [key, part] of Object.entries(cur.parts ?? {})) {
    const sent = done.parts?.[key];
    const same = sent !== undefined && sent.part.set === part.part.set;
    const delta = same ? part.delta - sent.delta : part.delta;
    const set = same ? undefined : part.part.set;
    if (delta === 0 && set === undefined) continue;
    const { set: _drop, ...rest } = part.part;
    parts[key] = { ...part, delta, part: set === undefined ? rest : { ...rest, set } };
  }
  return parts;
}

function leftShift(cur: PropShift, done: PropShift): PropShift | null {
  const delta = cur.delta - done.delta;
  const parts = leftParts(cur, done);
  if (delta === 0 && Object.keys(parts).length === 0) return null;
  return { ...cur, delta, parts };
}

export function withoutShifts(shifts: Shifts, props: readonly string[], sent?: Shifts): Shifts {
  const next = { ...shifts };
  for (const prop of props as DirectStyleProperty[]) delete next[prop];
  for (const [prop, done] of Object.entries(sent ?? {}) as [DirectStyleProperty, PropShift][]) {
    const cur = next[prop];
    const left = cur ? leftShift(cur, done) : null;
    if (left) next[prop] = left;
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
