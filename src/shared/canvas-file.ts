export const CANVAS_FILE = '.studio/canvas.json';
export const CANVAS_DIR = '.studio';
export const CANVAS_FILE_VERSION = 1;
export const CANVAS_MAX_FRAMES = 24;
export const CANVAS_MIN_SIDE = 200;
export const CANVAS_MAX_SIDE = 4000;
export const CANVAS_MAX_COORD = 100_000;
export const CANVAS_LABEL_MAX = 40;
export const CANVAS_GAP = 80;

const FRAME_ID_RE = /^f\d{1,4}$/;
const DIRECTION_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const PATH_MAX = 200;

export interface CanvasFileFrame {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  order: number;
  directionId?: string;
  path?: string;
  label?: string;
  hidden?: boolean;
}

export interface CanvasFile {
  version: number;
  frames: CanvasFileFrame[];
  lofi: string[];
}

export function emptyCanvasFile(): CanvasFile {
  return { version: CANVAS_FILE_VERSION, frames: [], lofi: [] };
}

export function cleanFramePath(raw: string): string | null {
  const path = raw.trim().replace(/^\/+/, '');
  if (path === '') return '';
  if (path.length > PATH_MAX || /[\\\s#?:]|%2e|%2f|%5c/i.test(path)) return null;
  if (path.split('/').some((part) => part === '..' || part === '.')) return null;
  return path;
}

export function cleanFrameLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const label = raw.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, CANVAS_LABEL_MAX);
  return label === '' ? null : label;
}

export function isFrameId(value: unknown): value is string {
  return typeof value === 'string' && FRAME_ID_RE.test(value);
}

export function isDirectionRef(value: unknown): value is string {
  return typeof value === 'string' && DIRECTION_ID_RE.test(value);
}

function side(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.round(value);
  return n >= CANVAS_MIN_SIDE && n <= CANVAS_MAX_SIDE ? n : null;
}

function coord(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.round(value);
  return Math.abs(n) <= CANVAS_MAX_COORD ? n : null;
}

export function parseCanvasFrame(raw: unknown): CanvasFileFrame | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Record<string, unknown>;
  if (!isFrameId(f.id)) return null;
  const width = side(f.width);
  const height = side(f.height);
  const x = coord(f.x);
  const y = coord(f.y);
  if (width === null || height === null || x === null || y === null) return null;
  const order = typeof f.order === 'number' && Number.isFinite(f.order) ? Math.round(f.order) : 0;
  const frame: CanvasFileFrame = { id: f.id, width, height, x, y, order };
  if (isDirectionRef(f.directionId)) frame.directionId = f.directionId;
  const path = typeof f.path === 'string' ? cleanFramePath(f.path) : null;
  if (path) frame.path = path;
  const label = cleanFrameLabel(f.label);
  if (label) frame.label = label;
  if (f.hidden === true) frame.hidden = true;
  return frame;
}

export function normalizeCanvasFile(file: CanvasFile): CanvasFile {
  const seen = new Set<string>();
  const frames = [...file.frames]
    .map((frame, index) => ({ frame, index }))
    .sort((a, b) => a.frame.order - b.frame.order || a.index - b.index)
    .map(({ frame }) => frame)
    .filter((frame) => (seen.has(frame.id) ? false : (seen.add(frame.id), true)))
    .slice(0, CANVAS_MAX_FRAMES)
    .map((frame, order) => ({ ...frame, order }));
  const lofi = [...new Set(file.lofi.filter(isDirectionRef))].sort();
  return { version: CANVAS_FILE_VERSION, frames, lofi };
}

export function parseCanvasFile(raw: unknown): CanvasFile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.frames)) return null;
  const frames = record.frames.map(parseCanvasFrame).filter((frame): frame is CanvasFileFrame => frame !== null);
  const lofi = Array.isArray(record.lofi) ? record.lofi.filter(isDirectionRef) : [];
  return normalizeCanvasFile({ version: CANVAS_FILE_VERSION, frames, lofi });
}

export function parseCanvasText(text: string): CanvasFile | null {
  try {
    return parseCanvasFile(JSON.parse(text));
  } catch {
    return null;
  }
}

function sortedValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item !== undefined) out[key] = sortedValue(item);
    }
    return out;
  }
  if (typeof value === 'number') return Math.round(value);
  return value;
}

export function serializeCanvasFile(file: CanvasFile): string {
  const clean = normalizeCanvasFile(file);
  const body: Record<string, unknown> = { version: clean.version, frames: clean.frames };
  if (clean.lofi.length > 0) body.lofi = clean.lofi;
  return `${JSON.stringify(sortedValue(body), null, 2)}\n`;
}

export function nextFrameId(frames: readonly { id: string }[]): string {
  let n = frames.length + 1;
  while (frames.some((frame) => frame.id === `f${n}`)) n += 1;
  return `f${n}`;
}
