export type PinMode = 'start' | 'end' | 'both' | 'center' | 'scale';
export type PinAxis = 'x' | 'y';
export type InsetProp = 'left' | 'right' | 'top' | 'bottom';

interface AxisKeys {
  start: InsetProp;
  end: InsetProp;
  size: 'width' | 'height';
  offset: string;
  container: string;
  box: string;
}

const AXES: Record<PinAxis, AxisKeys> = {
  x: { start: 'left', end: 'right', size: 'width', offset: 'pin-left', container: 'container-width', box: 'box-width' },
  y: { start: 'top', end: 'bottom', size: 'height', offset: 'pin-top', container: 'container-height', box: 'box-height' },
};

export const PIN_OPTIONS: Record<PinAxis, { value: PinMode; label: string }[]> = {
  x: [
    { value: 'start', label: 'Left' },
    { value: 'end', label: 'Right' },
    { value: 'both', label: 'Left and right' },
    { value: 'center', label: 'Center' },
    { value: 'scale', label: 'Scale' },
  ],
  y: [
    { value: 'start', label: 'Top' },
    { value: 'end', label: 'Bottom' },
    { value: 'both', label: 'Top and bottom' },
    { value: 'center', label: 'Center' },
    { value: 'scale', label: 'Scale' },
  ],
};

function isSet(value: string | undefined): boolean {
  const text = (value ?? '').trim();
  return text !== '' && text !== 'auto';
}

export function pinModeOf(axis: PinAxis, styles: Record<string, string>): PinMode {
  const keys = AXES[axis];
  const start = styles[`authored-${keys.start}`] ?? '';
  const end = styles[`authored-${keys.end}`] ?? '';
  if (isSet(start) && isSet(end)) return 'both';
  if (isSet(end)) return 'end';
  if (start.includes('50%')) return 'center';
  if (/%\s*$/.test(start)) return 'scale';
  return 'start';
}

function px(value: number): string {
  return `${Number(value.toFixed(2))}px`;
}

function percent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

function centered(offset: number): string {
  const rounded = Number(offset.toFixed(2));
  if (rounded === 0) return '50%';
  return `calc(50% ${rounded < 0 ? '-' : '+'} ${Math.abs(rounded)}px)`;
}

function numberOf(styles: Record<string, string>, key: string): number {
  const value = parseFloat(styles[key] ?? '');
  return Number.isFinite(value) ? value : 0;
}

export function pinPatch(axis: PinAxis, mode: PinMode, styles: Record<string, string>): Record<string, string> {
  const keys = AXES[axis];
  const pos = numberOf(styles, keys.offset);
  const size = numberOf(styles, keys.box);
  const box = numberOf(styles, keys.container);
  const current = pinModeOf(axis, styles);
  const fixed = current === 'both' || current === 'scale' ? { [keys.size]: px(size) } : {};
  if (mode === 'end') return { [keys.start]: '', [keys.end]: px(box - pos - size), ...fixed };
  if (mode === 'both') return { [keys.start]: px(pos), [keys.end]: px(box - pos - size), [keys.size]: '' };
  if (mode === 'center') return { [keys.start]: centered(pos - box / 2), [keys.end]: '', ...fixed };
  if (mode === 'scale' && box > 0) return { [keys.start]: percent((pos / box) * 100), [keys.end]: '', [keys.size]: percent((size / box) * 100) };
  return { [keys.start]: px(pos), [keys.end]: '', ...fixed };
}

export function pinFields(axis: PinAxis, mode: PinMode): InsetProp[] {
  const keys = AXES[axis];
  if (mode === 'start') return [keys.start];
  if (mode === 'end') return [keys.end];
  if (mode === 'both') return [keys.start, keys.end];
  return [];
}
