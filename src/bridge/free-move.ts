import type { FreeMoveDrag, FreeMoveInsert, FreeMoveLine, FreeMoveStart, NudgeBase, SelectionContext, SourceLoc } from '../shared/contracts.js';
import { authoredBox, authoredMargins } from './authored.js';
import { isLayer } from './layers.js';

type Rect = SelectionContext['rect'];
type FlowAxis = 'x' | 'y' | 'grid';

const START_PX = 4;
const FRAME_SIZED = 0.9;
const SIBLING_MAX = 200;
const MAPPED = 'This element is one of several copies made by one line of code (a .map() loop, or a component used more than once), so it cannot move on its own. Change the order of the data, or move the component use in the code.';
const NO_SOURCE = 'This element has no source location, so it cannot move here.';
const REF_NO_SOURCE = 'The element at the drop place has no source location, so the move cannot go there.';

export type FreeMoveMessage = { type: 'move-start'; move: FreeMoveStart } | { type: 'move-live'; drag: FreeMoveDrag } | { type: 'move-drop'; drag: FreeMoveDrag } | { type: 'move-cancel' };

export interface FreeMovePorts {
  enabled: () => boolean;
  selected: () => Element | null;
  selectorFor: (element: Element) => string;
  rectOf: (element: Element) => Rect;
  ownSource: (element: Element) => Promise<{ own: SourceLoc | null; usedAt: SourceLoc | null }>;
  post: (body: FreeMoveMessage) => void;
  promote: (element: Element) => void;
}

export interface FreeMove {
  down(event: PointerEvent, hit: Element | null): boolean;
  move(event: PointerEvent): boolean;
  up(event: PointerEvent): boolean;
  cancel(): boolean;
  takeClick(): boolean;
}

interface Item {
  element: Element;
  rect: Rect;
}

interface Session {
  start: FreeMoveStart;
  axis: FlowAxis;
  flow: Item[];
  order: Element[];
  sources: Promise<{ own: SourceLoc | null; usedAt: SourceLoc | null }[]>;
  tag: string;
}

interface Drag {
  element: Element;
  x: number;
  y: number;
  pointer: number;
  session: Session | null;
  promoted: boolean;
  started: Promise<void>;
  ready: boolean;
  cancelled: boolean;
}

const num = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isOut = (element: Element): boolean => {
  const position = getComputedStyle(element).position;
  return position === 'absolute' || position === 'fixed';
};

function flowAxis(parent: Element): FlowAxis {
  const cs = getComputedStyle(parent);
  if (cs.display.includes('grid')) return 'grid';
  if (!cs.display.includes('flex')) return 'y';
  if (cs.flexWrap !== 'nowrap' || cs.flexDirection.endsWith('reverse')) return 'grid';
  return cs.flexDirection.startsWith('row') ? 'x' : 'y';
}

function siblingsOf(element: Element): Element[] {
  const parent = element.parentElement;
  if (!parent) return [];
  return Array.from(parent.children)
    .filter((child) => child !== element && isLayer(child))
    .slice(0, SIBLING_MAX);
}

function isFrameSized(element: Element): boolean {
  if (element.parentElement === document.body) return true;
  const rect = element.getBoundingClientRect();
  return rect.width >= document.documentElement.clientWidth * FRAME_SIZED;
}

function marqueeFirst(selected: Element, hit: Element): boolean {
  return hit === selected && Array.from(selected.children).some(isLayer) && isFrameSized(selected);
}

const PROMOTE_WAIT_MS = 80;

function outerSvg(element: Element): SVGSVGElement | null {
  if (!(element instanceof SVGElement) || element instanceof SVGSVGElement) return null;
  let svg = element.ownerSVGElement;
  while (svg?.ownerSVGElement) svg = svg.ownerSVGElement;
  return svg;
}

function visible(rect: Rect): boolean {
  return rect.width > 0 || rect.height > 0;
}

type AbsoluteStart = Pick<FreeMoveStart, 'left' | 'top' | 'convert' | 'fromRight' | 'fromBottom'>;

function anchored(element: Element, cs: CSSStyleDeclaration): AbsoluteStart {
  const box = authoredBox(element, true);
  const fromRight = box.left === undefined && box.right !== undefined && box.right !== 'auto';
  const fromBottom = box.top === undefined && box.bottom !== undefined && box.bottom !== 'auto';
  return { left: num(fromRight ? cs.right : cs.left), top: num(fromBottom ? cs.bottom : cs.top), convert: false, fromRight, fromBottom };
}

const OFFSET_POSITIONS = new Set(['absolute', 'fixed', 'relative']);

export function nudgeBaseOf(element: Element): NudgeBase {
  const cs = getComputedStyle(element);
  if (OFFSET_POSITIONS.has(cs.position)) {
    const at = anchored(element, cs);
    return { mode: 'position', x: at.left, y: at.top, fromRight: at.fromRight, fromBottom: at.fromBottom, lockX: false, lockY: false };
  }
  const authored = authoredMargins(element);
  const lockX = authored.left === 'auto';
  const lockY = authored.top === 'auto';
  const x = num(cs.marginLeft);
  const y = num(cs.marginTop);
  const hasMargin = (x !== 0 && !lockX) || (y !== 0 && !lockY);
  return { mode: hasMargin ? 'margin' : 'none', x, y, fromRight: false, fromBottom: false, lockX, lockY };
}

function absoluteStart(element: Element, others: Element[]): AbsoluteStart | null {
  const cs = getComputedStyle(element);
  if (cs.position === 'absolute' || cs.position === 'fixed') return anchored(element, cs);
  if (cs.position !== 'static' || others.length === 0 || !others.every(isOut) || !(element instanceof HTMLElement)) return null;
  return { left: element.offsetLeft - num(cs.marginLeft), top: element.offsetTop - num(cs.marginTop), convert: true, fromRight: false, fromBottom: false };
}

function placeOf(loc: { own: SourceLoc | null; usedAt: SourceLoc | null } | undefined): SourceLoc | null {
  return loc?.usedAt ?? loc?.own ?? null;
}

function sourceKey(loc: SourceLoc | null): string {
  return loc ? `${loc.file}:${loc.line}:${loc.col}` : '';
}

function begin(element: Element, ports: FreeMovePorts): Session {
  const others = siblingsOf(element);
  const parent = element.parentElement;
  const abs = absoluteStart(element, others);
  const rects = others.map((other) => ({ element: other, rect: ports.rectOf(other) })).filter((item) => visible(item.rect));
  const flow = rects.filter((item) => !isOut(item.element));
  const order = parent ? Array.from(parent.children).filter((child) => child === element || flow.some((item) => item.element === child)) : [element];
  const start: FreeMoveStart = {
    selector: ports.selectorFor(element),
    mode: abs ? 'absolute' : 'flow',
    rect: ports.rectOf(element),
    parent: parent && parent !== document.body ? ports.rectOf(parent) : null,
    siblings: rects.map((item) => item.rect),
    left: abs?.left ?? 0,
    top: abs?.top ?? 0,
    convert: abs?.convert ?? false,
    fromRight: abs?.fromRight ?? false,
    fromBottom: abs?.fromBottom ?? false,
    transform: getComputedStyle(element).transform,
  };
  const sources = Promise.all([element, ...flow.map((item) => item.element)].map((each) => ports.ownSource(each)));
  return { start, axis: parent ? flowAxis(parent) : 'y', flow, order, sources, tag: element.tagName.toLowerCase() };
}

const centerOf = (rect: Rect, axis: 'x' | 'y'): number => (axis === 'x' ? rect.x + rect.width / 2 : rect.y + rect.height / 2);

function linearPick(flow: Item[], axis: 'x' | 'y', x: number, y: number): { index: number; after: boolean } | null {
  if (flow.length === 0) return null;
  const p = axis === 'x' ? x : y;
  const index = flow.findIndex((item) => p < centerOf(item.rect, axis));
  return index < 0 ? { index: flow.length - 1, after: true } : { index, after: false };
}

function gridPick(flow: Item[], x: number, y: number): { index: number; after: boolean } | null {
  let best = -1;
  let bestDist = Infinity;
  flow.forEach((item, index) => {
    const dist = Math.hypot(x - centerOf(item.rect, 'x'), y - centerOf(item.rect, 'y'));
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  });
  const item = flow[best];
  if (!item) return null;
  const inRow = y >= item.rect.y && y <= item.rect.y + item.rect.height;
  return { index: best, after: inRow ? x > centerOf(item.rect, 'x') : y > centerOf(item.rect, 'y') };
}

function lineFor(s: Session, index: number, after: boolean): FreeMoveLine {
  const ref = (s.flow[index] as Item).rect;
  if (s.axis === 'grid') return { axis: 'x', at: after ? ref.x + ref.width : ref.x, from: ref.y, to: ref.y + ref.height };
  const axis = s.axis;
  const near = s.flow[after ? index + 1 : index - 1]?.rect;
  const edge = axis === 'x' ? (after ? ref.x + ref.width : ref.x) : after ? ref.y + ref.height : ref.y;
  const other = near ? (axis === 'x' ? (after ? near.x : near.x + near.width) : after ? near.y : near.y + near.height) : edge;
  const at = (edge + other) / 2;
  return axis === 'x' ? { axis: 'x', at, from: ref.y, to: ref.y + ref.height } : { axis: 'y', at, from: ref.x, to: ref.x + ref.width };
}

function unchanged(s: Session, element: Element, index: number, after: boolean): boolean {
  const ref = (s.flow[index] as Item).element;
  const own = s.order.indexOf(element);
  const at = s.order.indexOf(ref);
  return after ? at === own - 1 : at === own + 1;
}

interface Picked {
  drag: FreeMoveDrag;
  index: number;
}

function pickOf(s: Session, element: Element, event: PointerEvent): { index: number; after: boolean } | null {
  if (s.start.mode !== 'flow') return null;
  const pick = s.axis === 'grid' ? gridPick(s.flow, event.clientX, event.clientY) : linearPick(s.flow, s.axis, event.clientX, event.clientY);
  return pick && (event.altKey || !unchanged(s, element, pick.index, pick.after)) ? pick : null;
}

function dragOf(d: Drag, s: Session, event: PointerEvent): Picked {
  const pick = pickOf(s, d.element, event);
  const insert: FreeMoveInsert | null = pick ? { line: lineFor(s, pick.index, pick.after), after: pick.after } : null;
  return { drag: { dx: event.clientX - d.x, dy: event.clientY - d.y, alt: event.altKey, free: event.metaKey || event.ctrlKey, insert }, index: pick?.index ?? -1 };
}

async function resolveDrop(s: Session, { drag, index }: Picked): Promise<FreeMoveDrag> {
  if (s.start.mode !== 'flow' || !drag.insert) return drag;
  const [first, ...rest] = await s.sources;
  const own = placeOf(first);
  const ref = s.flow[index];
  const refSource = placeOf(rest[index]);
  const { line, after } = drag.insert;
  if (!own) return { ...drag, insert: null, note: NO_SOURCE };
  if (rest.some((loc) => sourceKey(placeOf(loc)) === sourceKey(own))) return { ...drag, insert: null, note: MAPPED };
  if (!ref || !refSource) return { ...drag, insert: null, note: REF_NO_SOURCE };
  const self = first?.usedAt ? { source: own } : { source: own, tag: s.tag };
  const target = rest[index]?.usedAt ? { source: refSource } : { source: refSource, tag: ref.element.tagName.toLowerCase() };
  return { ...drag, insert: { line, after, self, ref: target } };
}

export function createFreeMove(ports: FreeMovePorts): FreeMove {
  let drag: Drag | null = null;
  let swallow = false;

  const finish = (): void => {
    try {
      if (drag?.session) document.documentElement.releasePointerCapture(drag.pointer);
    } catch {
      void 0;
    }
    drag = null;
  };

  const activate = (d: Drag, event: PointerEvent): Session => {
    const session = begin(d.element, ports);
    d.session = session;
    try {
      document.documentElement.setPointerCapture(event.pointerId);
    } catch {
      void 0;
    }
    const announce = () => {
      if (d.cancelled) return;
      d.ready = true;
      ports.post({ type: 'move-start', move: session.start });
    };
    if (!d.promoted) announce();
    else {
      ports.promote(d.element);
      d.started = new Promise((done) => setTimeout(() => done(announce()), PROMOTE_WAIT_MS));
    }
    return session;
  };

  return {
    down(event, hit) {
      swallow = false;
      drag = null;
      const selected = ports.selected();
      if (event.button !== 0 || event.shiftKey || !ports.enabled() || !selected?.isConnected || !hit || !selected.contains(hit) || marqueeFirst(selected, hit)) return false;
      const svg = outerSvg(selected);
      drag = { element: svg ?? selected, x: event.clientX, y: event.clientY, pointer: event.pointerId, session: null, promoted: svg !== null, started: Promise.resolve(), ready: false, cancelled: false };
      return true;
    },
    move(event) {
      const d = drag;
      if (!d) return false;
      if ((event.buttons & 1) === 0) {
        d.cancelled = true;
        if (d.session) ports.post({ type: 'move-cancel' });
        finish();
        return false;
      }
      if (!d.session && Math.hypot(event.clientX - d.x, event.clientY - d.y) < START_PX) return true;
      const session = d.session ?? activate(d, event);
      if (d.ready) ports.post({ type: 'move-live', drag: dragOf(d, session, event).drag });
      return true;
    },
    up(event) {
      const d = drag;
      if (!d) return false;
      finish();
      if (!d.session) return false;
      swallow = true;
      const session = d.session;
      const picked = dragOf(d, session, event);
      void d.started.then(() => resolveDrop(session, picked)).then((result) => ports.post({ type: 'move-drop', drag: result }));
      return true;
    },
    cancel() {
      const was = drag?.session != null;
      if (drag) drag.cancelled = true;
      if (was) ports.post({ type: 'move-cancel' });
      finish();
      return was;
    },
    takeClick() {
      const was = swallow;
      swallow = false;
      return was;
    },
  };
}
