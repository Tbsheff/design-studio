import type { StyleValues } from './cssValues';

export type Axis = 'width' | 'height';
export type SizeMode = 'hug' | 'fill' | 'fixed';
export type AxisRole = 'main' | 'cross' | 'none';

export interface ParentLayout {
  flex: boolean;
  grid: boolean;
  row: boolean;
}

export const SIZE_MODES: { value: SizeMode; label: string }[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'hug', label: 'Hug' },
  { value: 'fill', label: 'Fill' },
];

const HUG_VALUES = new Set(['fit-content', 'max-content', 'min-content']);

export function isFlexDisplay(display: string): boolean {
  return display === 'flex' || display === 'inline-flex';
}

export function parentLayout(styles: Record<string, string>): ParentLayout {
  const display = (styles['parent-display'] ?? '').trim();
  const direction = (styles['parent-flex-direction'] ?? '').trim();
  return {
    flex: isFlexDisplay(display),
    grid: display === 'grid' || display === 'inline-grid',
    row: !direction.startsWith('column'),
  };
}

export function axisRole(axis: Axis, parent: ParentLayout): AxisRole {
  if (!parent.flex) return 'none';
  return (axis === 'width') === parent.row ? 'main' : 'cross';
}

export function flexGrow(flex: string): number {
  const first = flex.trim().split(/\s+/)[0] ?? '';
  if (first === 'auto') return 1;
  const grow = Number(first);
  return Number.isFinite(grow) ? grow : 0;
}

type Values = Pick<StyleValues, Axis | 'flex' | 'align-self'>;

export function sizeModeOf(axis: Axis, values: Values, parent: ParentLayout): SizeMode {
  const role = axisRole(axis, parent);
  if (role === 'main' && flexGrow(values.flex) > 0) return 'fill';
  if (role === 'cross' && values['align-self'] === 'stretch') return 'fill';
  const size = values[axis].trim();
  if (size === '100%') return 'fill';
  if (HUG_VALUES.has(size)) return 'hug';
  return 'fixed';
}

export function sizePatch(axis: Axis, mode: SizeMode, values: Values, parent: ParentLayout, usedPx: string): Partial<StyleValues> {
  const role = axisRole(axis, parent);
  const clearFlex = role === 'main' && flexGrow(values.flex) > 0 ? { flex: '' } : {};
  const clearStretch = role === 'cross' && values['align-self'] === 'stretch' ? { 'align-self': '' } : {};
  const authoredSize = HUG_VALUES.has(values[axis].trim()) || values[axis].trim() === '100%';
  if (mode === 'hug') return { [axis]: 'fit-content', ...clearFlex, ...clearStretch };
  if (mode === 'fixed') return { [axis]: usedPx, ...clearFlex, ...clearStretch };
  if (role === 'main') return { flex: '1', ...(authoredSize ? { [axis]: '' } : {}) };
  if (role === 'cross') return { 'align-self': 'stretch', [axis]: '' };
  return { [axis]: '100%' };
}

export interface AlignCell {
  justify: string;
  align: string;
}

const AXIS_VALUES = ['flex-start', 'center', 'flex-end'] as const;

export function alignSlot(value: string): number | null {
  const v = value.trim();
  if (v === 'flex-start' || v === 'start' || v === 'left' || v === 'normal' || v === 'self-start') return 0;
  if (v === 'center') return 1;
  if (v === 'flex-end' || v === 'end' || v === 'right' || v === 'self-end') return 2;
  return null;
}

export function alignCell(col: number, row: number, isRow: boolean): AlignCell {
  const across = AXIS_VALUES[col] ?? 'flex-start';
  const down = AXIS_VALUES[row] ?? 'flex-start';
  return isRow ? { justify: across, align: down } : { justify: down, align: across };
}

export function activeCell(justify: string, align: string, isRow: boolean): { col: number; row: number } | null {
  const j = alignSlot(justify);
  const a = align.trim() === 'normal' || align.trim() === 'stretch' ? null : alignSlot(align);
  if (j === null || a === null) return null;
  return isRow ? { col: j, row: a } : { col: a, row: j };
}
