import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { BridgeToParent, SelectionContext } from '../../shared/contracts';
import type { InsertTarget } from '../../shared/insert';
import type { VectorRequest, VectorResult } from '../../shared/vector';
import { errorText } from '../api';
import type { ParentMessageBody } from '../bridge';
import { penPath, type PenAnchor } from '../drawing';
import { runVector, useVectorTool, vectorTool, type VectorToolId } from '../vectorTool';
import '../styles/vector.css';

type Point = { x: number; y: number };
type Placed = Omit<Extract<VectorRequest, { op: 'shape' }>, 'target' | 'relativeParent'> | Omit<Extract<VectorRequest, { op: 'path' }>, 'target' | 'relativeParent'>;
type Drop = { selection: SelectionContext | null; inside: boolean };

interface Props {
  projectId: string;
  directionId: string;
  zoom: number;
  frame: { width: number; height: number };
  post: (body: ParentMessageBody) => void;
  listen: (handler: (message: BridgeToParent) => void) => () => void;
  notify: (message: string) => void;
  page?: string;
}

const CLOSE_HIT_SCREEN = 8;
const DRAG_SCREEN = 3;
const DEFAULT_SIZE = 100;
const DROP_WAIT_MS = 1500;
const RESELECT_MS = [500, 1200, 2500];

function useDropAt(post: Props['post'], listen: Props['listen']) {
  const waiting = useRef(new Map<string, (drop: Drop) => void>());
  const seq = useRef(0);
  useEffect(
    () =>
      listen((message) => {
        if (message.type !== 'element-at') return;
        const done = waiting.current.get(message.requestId);
        if (!done) return;
        waiting.current.delete(message.requestId);
        done({ selection: message.selection, inside: message.inside });
      }),
    [listen],
  );
  return (point: Point): Promise<Drop> =>
    new Promise((resolve) => {
      const id = `vector-${++seq.current}`;
      waiting.current.set(id, resolve);
      window.setTimeout(() => {
        if (waiting.current.delete(id)) resolve({ selection: null, inside: false });
      }, DROP_WAIT_MS);
      post({ type: 'element-at', requestId: id, x: point.x, y: point.y });
    });
}

function px(value: string | undefined, index: number): number {
  const parts = (value ?? '').trim().split(/\s+/);
  const raw = parts[index] ?? parts[index % 2] ?? parts[0] ?? '0';
  return Number.parseFloat(raw) || 0;
}

function placeOf(drop: Drop): { target: InsertTarget; origin: Point; relativeParent: boolean } | string {
  const selection = drop.selection;
  if (!selection) return 'Start the drawing on an element in the frame.';
  const body = selection.tag.toLowerCase() === 'body';
  if (!selection.source && !selection.owners?.length && !body) return 'This element has no source location, so the studio cannot draw into it.';
  const border = selection.styles['border-width'];
  const origin = { x: selection.rect.x + px(border, 3), y: selection.rect.y + px(border, 0) };
  const target: InsertTarget = { source: selection.source, tag: selection.tag.toLowerCase(), selector: selection.selector, ...(selection.owners?.length ? { owners: selection.owners } : {}) };
  return { target, origin, relativeParent: (selection.styles.position ?? 'static') === 'static' };
}

function boxOf(a: Point, b: Point, square: boolean) {
  let width = Math.abs(b.x - a.x);
  let height = Math.abs(b.y - a.y);
  if (square) width = height = Math.max(width, height);
  return { x: b.x < a.x ? a.x - width : a.x, y: b.y < a.y ? a.y - height : a.y, width, height };
}

function useCommit(p: Props, dropAt: (point: Point) => Promise<Drop>) {
  const busy = useRef(false);
  return async (at: Point, build: (origin: Point) => Placed) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const place = placeOf(await dropAt(at));
      if (typeof place === 'string') return p.notify(place);
      const request = { ...build(place.origin), target: place.target, relativeParent: place.relativeParent, ...(p.page ? { page: p.page } : {}) } as VectorRequest;
      const result: VectorResult = await runVector(p.projectId, p.directionId, request);
      vectorTool.set(null);
      const at0 = result.select[0];
      if (at0) for (const wait of RESELECT_MS) window.setTimeout(() => p.post({ type: 'select-source', sourceLoc: `${at0.file}:${at0.line}:${at0.col}`, tag: at0.tag, text: '' }), wait);
    } catch (error) {
      p.notify(errorText(error));
    } finally {
      busy.current = false;
    }
  };
}

function ShapePreview({ tool, box, zoom }: { tool: VectorToolId; box: { x: number; y: number; width: number; height: number }; zoom: number }) {
  const stroke = 1.5 / zoom;
  return (
    <>
      <svg className="vector-preview" width="100%" height="100%" aria-hidden="true">
        {tool === 'ellipse' ? (
          <ellipse cx={box.x + box.width / 2} cy={box.y + box.height / 2} rx={box.width / 2} ry={box.height / 2} strokeWidth={stroke} />
        ) : (
          <rect x={box.x} y={box.y} width={box.width} height={box.height} strokeWidth={stroke} />
        )}
      </svg>
      <span className="vector-size" style={{ left: box.x + box.width / 2, top: box.y + box.height }}>
        {Math.round(box.width)} × {Math.round(box.height)}
      </span>
    </>
  );
}

function useShapeTool(p: Props, tool: VectorToolId, commit: ReturnType<typeof useCommit>, pointOf: (event: PointerEvent) => Point | null) {
  const [drag, setDrag] = useState<{ from: Point; to: Point; square: boolean } | null>(null);
  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    const point = pointOf(event);
    if (event.button !== 0 || !point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ from: point, to: point, square: event.shiftKey });
  };
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const point = pointOf(event);
    if (drag && point) setDrag({ ...drag, to: point, square: event.shiftKey });
  };
  const onUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    setDrag(null);
    const to = pointOf(event) ?? drag.to;
    const moved = Math.hypot(to.x - drag.from.x, to.y - drag.from.y) * p.zoom > DRAG_SCREEN;
    const box = moved ? boxOf(drag.from, to, event.shiftKey) : { x: drag.from.x, y: drag.from.y, width: DEFAULT_SIZE, height: DEFAULT_SIZE };
    const shape = tool === 'ellipse' ? 'ellipse' : 'rect';
    void commit(drag.from, (origin) => ({ op: 'shape', shape, box: { x: box.x - origin.x, y: box.y - origin.y, width: box.width, height: box.height } }));
  };
  const preview = drag ? <ShapePreview tool={tool} box={boxOf(drag.from, drag.to, drag.square)} zoom={p.zoom} /> : null;
  return { onDown, onMove, onUp, preview };
}

function PenPreview({ anchors, hover, zoom, closing }: { anchors: PenAnchor[]; hover: Point | null; zoom: number; closing: boolean }) {
  const last = anchors.at(-1);
  const first = anchors[0];
  const stroke = 1.5 / zoom;
  const r = 4 / zoom;
  const rubber = last && hover ? penPath([last, { x: hover.x, y: hover.y }], false) : '';
  return (
    <svg className="vector-preview pen" width="100%" height="100%" aria-hidden="true">
      <path d={penPath(anchors, false)} strokeWidth={stroke} />
      {rubber && <path className="rubber" d={rubber} strokeWidth={stroke} />}
      {anchors.map((anchor, index) => (
        <g key={index}>
          {anchor.hout && anchor.hin && <path className="handle" d={`M${anchor.hin.x} ${anchor.hin.y}L${anchor.hout.x} ${anchor.hout.y}`} strokeWidth={stroke / 1.5} />}
          <rect className={index === 0 && closing ? 'anchor closing' : 'anchor'} x={anchor.x - r} y={anchor.y - r} width={r * 2} height={r * 2} strokeWidth={stroke} />
        </g>
      ))}
      {first && closing && <circle className="close-ring" cx={first.x} cy={first.y} r={r * 2} strokeWidth={stroke} />}
    </svg>
  );
}

function usePenTool(p: Props, commit: ReturnType<typeof useCommit>, pointOf: (event: PointerEvent) => Point | null) {
  const [anchors, setAnchors] = useState<PenAnchor[]>([]);
  const [hover, setHover] = useState<Point | null>(null);
  const dragging = useRef(false);
  const live = useRef(anchors);
  live.current = anchors;
  const nearFirst = (point: Point | null) => {
    const first = live.current[0];
    return Boolean(point && first && live.current.length >= 2 && Math.hypot(point.x - first.x, point.y - first.y) * p.zoom <= CLOSE_HIT_SCREEN);
  };
  const finish = (closed: boolean) => {
    const list = live.current;
    setAnchors([]);
    setHover(null);
    const first = list[0];
    if (!first || list.length < 2) return vectorTool.set(null);
    void commit(first, (origin) => ({ op: 'path', d: penPath(list, closed, -origin.x, -origin.y), ...(closed ? { fill: '#D9D9D9' } : {}) }));
  };
  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    const point = pointOf(event);
    if (event.button !== 0 || !point) return;
    event.preventDefault();
    if (nearFirst(point)) return finish(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    setAnchors((prev) => [...prev, { x: point.x, y: point.y }]);
  };
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const point = pointOf(event);
    if (!point) return;
    setHover(point);
    if (!dragging.current) return;
    setAnchors((prev) => {
      const last = prev.at(-1);
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) * p.zoom < DRAG_SCREEN) return prev;
      return [...prev.slice(0, -1), { x: last.x, y: last.y, hout: point, hin: { x: 2 * last.x - point.x, y: 2 * last.y - point.y } }];
    });
  };
  const onUp = () => {
    dragging.current = false;
  };
  const onKey = (key: string): boolean => {
    if (key === 'Enter' && live.current.length > 0) finish(true);
    else if (key === 'Escape' && live.current.length > 0) finish(false);
    else if (key === 'Backspace' && live.current.length > 0) setAnchors((prev) => prev.slice(0, -1));
    else return false;
    return true;
  };
  const preview = <PenPreview anchors={anchors} hover={dragging.current ? null : hover} zoom={p.zoom} closing={nearFirst(hover)} />;
  return { onDown, onMove, onUp, onKey, preview, drawing: anchors.length > 0 };
}

const HINTS: Record<VectorToolId, string> = {
  rect: 'Drag to draw a rectangle. Shift keeps it square. Esc stops.',
  ellipse: 'Drag to draw an ellipse. Shift keeps it round. Esc stops.',
  pen: 'Click to add points, drag to curve. Click the first point or press Enter to close, Esc to end.',
};

export default function VectorLayer(p: Props) {
  const { tool } = useVectorTool();
  const root = useRef<HTMLDivElement>(null);
  const dropAt = useDropAt(p.post, p.listen);
  const commit = useCommit(p, dropAt);
  const pointOf = (event: { clientX: number; clientY: number }): Point | null => {
    const rect = root.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return { x: ((event.clientX - rect.left) * p.frame.width) / rect.width, y: ((event.clientY - rect.top) * p.frame.height) / rect.height };
  };
  const shape = useShapeTool(p, tool ?? 'rect', commit, pointOf);
  const pen = usePenTool(p, commit, pointOf);
  const penOn = tool === 'pen';
  const penKey = useRef(pen.onKey);
  penKey.current = pen.onKey;

  const active = tool !== null;
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (penOn && penKey.current(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        vectorTool.set(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, penOn]);

  if (!tool) return null;
  const handlers = penOn ? pen : shape;
  return (
    <div
      ref={root}
      className={`vector-layer ${tool}`}
      data-testid="vector-layer"
      aria-label={`${tool === 'pen' ? 'Pen' : tool === 'rect' ? 'Rectangle' : 'Ellipse'} tool`}
      style={{ width: p.frame.width, height: p.frame.height, ['--inv-zoom' as string]: 1 / p.zoom } as CSSProperties}
      tabIndex={-1}
      onPointerDown={(event) => {
        root.current?.focus({ preventScroll: true });
        handlers.onDown(event);
      }}
      onPointerMove={handlers.onMove}
      onPointerUp={handlers.onUp}
      onPointerCancel={handlers.onUp}
    >
      {handlers.preview}
      <span className="vector-hint" role="status">
        {HINTS[tool]}
      </span>
    </div>
  );
}
