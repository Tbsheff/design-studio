export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState {
  bounds: Rect;
  maximized: boolean;
}

export interface DisplayInfo {
  id: number;
  bounds: Rect;
  workArea: Rect;
}

export interface WindowStateFile {
  last: string | null;
  layouts: Record<string, WindowState>;
}

const MIN_OVERLAP_PX = 100;

function isRect(value: unknown): value is Rect {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(record[key]));
}

function isState(value: unknown): value is WindowState {
  return typeof value === 'object' && value !== null && isRect((value as { bounds?: unknown }).bounds);
}

export function layoutKey(displays: DisplayInfo[]): string {
  return displays
    .map((display) => `${display.id}:${display.bounds.x},${display.bounds.y},${display.bounds.width}x${display.bounds.height}`)
    .sort()
    .join('|');
}

export function parseStateFile(raw: unknown): WindowStateFile {
  if (isState(raw)) return { last: 'legacy', layouts: { legacy: { bounds: raw.bounds, maximized: Boolean(raw.maximized) } } };
  if (typeof raw !== 'object' || raw === null) return { last: null, layouts: {} };
  const record = raw as { last?: unknown; layouts?: unknown };
  const layouts: Record<string, WindowState> = {};
  if (typeof record.layouts === 'object' && record.layouts !== null) {
    for (const [key, value] of Object.entries(record.layouts)) if (isState(value)) layouts[key] = { bounds: value.bounds, maximized: Boolean(value.maximized) };
  }
  return { last: typeof record.last === 'string' && layouts[record.last] ? record.last : null, layouts };
}

function overlap(bounds: Rect, area: Rect): boolean {
  const x = Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x);
  const y = Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y);
  return x > MIN_OVERLAP_PX && y > MIN_OVERLAP_PX;
}

export function visible(bounds: Rect, displays: DisplayInfo[]): boolean {
  return displays.some((display) => overlap(bounds, display.workArea));
}

export function pickState(file: WindowStateFile, displays: DisplayInfo[]): WindowState | null {
  const exact = file.layouts[layoutKey(displays)];
  if (exact && visible(exact.bounds, displays)) return exact;
  const last = file.last ? file.layouts[file.last] : undefined;
  if (last && visible(last.bounds, displays)) return last;
  return null;
}

export function recordState(file: WindowStateFile, displays: DisplayInfo[], state: WindowState): WindowStateFile {
  const key = layoutKey(displays);
  return { last: key, layouts: { ...file.layouts, [key]: state } };
}
