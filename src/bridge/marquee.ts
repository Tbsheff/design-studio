import { MATCH_SELECT_MAX, type SelectionContext } from '../shared/contracts.js';
import { isLayer } from './layers.js';

type Rect = SelectionContext['rect'];

const START_PX = 4;
const EDGE_SLACK = 1;

export interface MarqueePorts {
  enabled: () => boolean;
  locked: (element: Element) => boolean;
  show: (rect: Rect | null) => void;
  pick: (elements: Element[], additive: boolean) => void;
}

export interface Marquee {
  down(event: PointerEvent, target: Element | null): void;
  move(event: PointerEvent): boolean;
  up(event: PointerEvent): void;
  cancel(): boolean;
  dragging(): boolean;
  takeClick(): boolean;
}

interface Drag {
  x: number;
  y: number;
  scope: Element;
  active: boolean;
  pointer: number;
  last: Rect | null;
}

function boxOf(drag: Drag, event: PointerEvent): Rect {
  const x = Math.min(drag.x, event.clientX);
  const y = Math.min(drag.y, event.clientY);
  return { x, y, width: Math.abs(event.clientX - drag.x), height: Math.abs(event.clientY - drag.y) };
}

function scopeOf(target: Element | null): Element {
  let current = target;
  while (current && current !== document.body && !Array.from(current.children).some(isLayer)) current = current.parentElement;
  return current && current !== document.documentElement ? current : document.body;
}

function inside(box: Rect, rect: DOMRect): boolean {
  if (rect.width === 0 && rect.height === 0) return false;
  return rect.left >= box.x - EDGE_SLACK && rect.top >= box.y - EDGE_SLACK && rect.right <= box.x + box.width + EDGE_SLACK && rect.bottom <= box.y + box.height + EDGE_SLACK;
}

export function coveredElements(scope: Element, box: Rect, locked: (element: Element) => boolean): Element[] {
  const picked: Element[] = [];
  const walk = (parent: Element): void => {
    for (const child of Array.from(parent.children)) {
      if (picked.length >= MATCH_SELECT_MAX) return;
      if (!isLayer(child) || locked(child)) continue;
      if (inside(box, child.getBoundingClientRect())) picked.push(child);
      else if (child.tagName.toLowerCase() !== 'svg') walk(child);
    }
  };
  walk(scope);
  return picked;
}

export function createMarquee(ports: MarqueePorts): Marquee {
  let drag: Drag | null = null;
  let swallow = false;

  const finish = (): void => {
    if (drag?.active) ports.show(null);
    try {
      if (drag) document.documentElement.releasePointerCapture(drag.pointer);
    } catch {
      void 0;
    }
    drag = null;
  };

  return {
    down(event, target) {
      swallow = false;
      if (event.button !== 0 || !ports.enabled()) return;
      drag = { x: event.clientX, y: event.clientY, scope: scopeOf(target), active: false, pointer: event.pointerId, last: null };
    },
    move(event) {
      if (!drag) return false;
      if ((event.buttons & 1) === 0) {
        if (drag.active && drag.last) ports.pick(coveredElements(drag.scope, drag.last, ports.locked), event.shiftKey);
        finish();
        return false;
      }
      if (!drag.active) {
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < START_PX) return false;
        drag.active = true;
        try {
          document.documentElement.setPointerCapture(event.pointerId);
        } catch {
          void 0;
        }
      }
      drag.last = boxOf(drag, event);
      ports.show(drag.last);
      return true;
    },
    up(event) {
      if (!drag) return;
      if (drag.active) {
        swallow = true;
        ports.pick(coveredElements(drag.scope, boxOf(drag, event), ports.locked), event.shiftKey);
      }
      finish();
    },
    cancel() {
      const was = drag?.active === true;
      finish();
      return was;
    },
    dragging: () => drag?.active === true,
    takeClick() {
      const was = swallow;
      swallow = false;
      return was;
    },
  };
}
