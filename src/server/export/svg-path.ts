export type PathPoint =
  | { x: number; y: number; moveTo?: boolean }
  | { x: number; y: number; curve: { type: 'cubic'; x1: number; y1: number; x2: number; y2: number } }
  | { x: number; y: number; curve: { type: 'quadratic'; x1: number; y1: number } }
  | { close: true };

export type Matrix = [number, number, number, number, number, number];

interface State {
  x: number;
  y: number;
  sx: number;
  sy: number;
  cubic: [number, number] | null;
  quad: [number, number] | null;
  out: PathPoint[];
}

type Handler = (s: State, a: number[], rel: boolean) => void;

const IMPLICIT: Record<string, string> = { M: 'L', m: 'l' };
const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2 };

function move(s: State, x: number, y: number, kind: 'M' | 'L'): void {
  s.x = x;
  s.y = y;
  if (kind === 'M') {
    s.sx = x;
    s.sy = y;
  }
  s.out.push(kind === 'M' ? { x, y, moveTo: true } : { x, y });
  s.cubic = null;
  s.quad = null;
}

function cubic(s: State, x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
  s.out.push({ x, y, curve: { type: 'cubic', x1, y1, x2, y2 } });
  s.x = x;
  s.y = y;
  s.cubic = [x2, y2];
  s.quad = null;
}

function quad(s: State, x1: number, y1: number, x: number, y: number): void {
  s.out.push({ x, y, curve: { type: 'quadratic', x1, y1 } });
  s.x = x;
  s.y = y;
  s.quad = [x1, y1];
  s.cubic = null;
}

const HANDLERS: Record<string, Handler> = {
  M: (s, [x = 0, y = 0], rel) => move(s, rel ? s.x + x : x, rel ? s.y + y : y, 'M'),
  L: (s, [x = 0, y = 0], rel) => move(s, rel ? s.x + x : x, rel ? s.y + y : y, 'L'),
  H: (s, [x = 0], rel) => move(s, rel ? s.x + x : x, s.y, 'L'),
  V: (s, [y = 0], rel) => move(s, s.x, rel ? s.y + y : y, 'L'),
  C: (s, [x1 = 0, y1 = 0, x2 = 0, y2 = 0, x = 0, y = 0], rel) => {
    const dx = rel ? s.x : 0;
    const dy = rel ? s.y : 0;
    cubic(s, x1 + dx, y1 + dy, x2 + dx, y2 + dy, x + dx, y + dy);
  },
  S: (s, [x2 = 0, y2 = 0, x = 0, y = 0], rel) => {
    const dx = rel ? s.x : 0;
    const dy = rel ? s.y : 0;
    const [cx, cy] = s.cubic ?? [s.x, s.y];
    cubic(s, 2 * s.x - cx, 2 * s.y - cy, x2 + dx, y2 + dy, x + dx, y + dy);
  },
  Q: (s, [x1 = 0, y1 = 0, x = 0, y = 0], rel) => {
    const dx = rel ? s.x : 0;
    const dy = rel ? s.y : 0;
    quad(s, x1 + dx, y1 + dy, x + dx, y + dy);
  },
  T: (s, [x = 0, y = 0], rel) => {
    const [qx, qy] = s.quad ?? [s.x, s.y];
    quad(s, 2 * s.x - qx, 2 * s.y - qy, rel ? s.x + x : x, rel ? s.y + y : y);
  },
};

function close(s: State): void {
  s.out.push({ close: true });
  s.x = s.sx;
  s.y = s.sy;
  s.cubic = null;
  s.quad = null;
}

function apply(point: PathPoint, m: Matrix): PathPoint {
  const [a, b, c, d, e, f] = m;
  const tx = (x: number, y: number): number => a * x + c * y + e;
  const ty = (x: number, y: number): number => b * x + d * y + f;
  if ('close' in point) return point;
  if (!('curve' in point)) return { ...point, x: tx(point.x, point.y), y: ty(point.x, point.y) };
  const at = { x: tx(point.x, point.y), y: ty(point.x, point.y) };
  if (point.curve.type === 'quadratic') return { ...at, curve: { type: 'quadratic', x1: tx(point.curve.x1, point.curve.y1), y1: ty(point.curve.x1, point.curve.y1) } };
  const { x1, y1, x2, y2 } = point.curve;
  return { ...at, curve: { type: 'cubic', x1: tx(x1, y1), y1: ty(x1, y1), x2: tx(x2, y2), y2: ty(x2, y2) } };
}

function step(s: State, cmd: string, tokens: string[], i: number): number | null {
  const upper = cmd.toUpperCase();
  const count = ARGS[upper];
  const handler = HANDLERS[upper];
  if (!count || !handler) return null;
  const args = tokens.slice(i, i + count).map(Number);
  if (args.length < count || args.some((n) => !Number.isFinite(n))) return null;
  if (s.out.length === 0 && upper !== 'M') return null;
  handler(s, args, cmd !== upper);
  return i + count;
}

export function parsePath(d: string, matrix: Matrix): PathPoint[] | null {
  if (!d.trim() || /[^MLHVCSQTZmlhvcsqtz\d\s,.eE+-]/.test(d)) return null;
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
  const s: State = { x: 0, y: 0, sx: 0, sy: 0, cubic: null, quad: null, out: [] };
  let cmd = '';
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i] ?? '';
    if (/[a-z]/i.test(token)) {
      cmd = token;
      i += 1;
      if (cmd === 'Z' || cmd === 'z') close(s);
      continue;
    }
    const next = step(s, cmd, tokens, i);
    if (next === null) return null;
    i = next;
    cmd = IMPLICIT[cmd] ?? cmd;
  }
  return s.out.length > 1 ? s.out.map((point) => apply(point, matrix)) : null;
}
