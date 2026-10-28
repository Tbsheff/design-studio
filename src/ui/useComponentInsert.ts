import { useCallback, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import type { BridgeToParent, ProjectKind, SelectionContext } from '../shared/contracts';
import type { InsertPosition, InsertTarget, InsertableComponent } from '../shared/insert';
import { useBridge, type BridgeFrame, type ParentMessageBody } from './bridge';
import { insertApi, insertBus, insertError, type DropHint, type InsertHost } from './componentInsert';
import { NO_SOURCE } from './structureEdits';

const RESELECT_EVERY_MS = 350;
const RESELECT_FOR_MS = 6000;

interface Frames {
  slots: { token: string; src: string }[];
  frontToken: string | null;
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  post: (body: ParentMessageBody) => void;
}

interface Options {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  enabled: boolean;
  frames: Frames;
  selection: SelectionContext[];
  notify: (message: string) => void;
}

interface DropAt {
  requestId: string;
  selection: SelectionContext | null;
  inside: boolean;
  label: string;
}

function targetOf(selection: SelectionContext): InsertTarget | null {
  if (!selection.source && !selection.owners?.length) return null;
  return { source: selection.source, tag: selection.tag.toLowerCase(), selector: selection.selector, ...(selection.owners?.length ? { owners: selection.owners } : {}) };
}

function newSelector(selector: string, position: InsertPosition): string {
  return position === 'inside' ? `${selector} > :last-child` : `${selector} + *`;
}

function frameRect(frames: Frames): { el: HTMLIFrameElement; rect: DOMRect } | null {
  const el = frames.frontToken ? frames.elements.current[frames.frontToken] : null;
  return el ? { el, rect: el.getBoundingClientRect() } : null;
}

function localPoint(frames: Frames, x: number, y: number): { x: number; y: number } | null {
  const found = frameRect(frames);
  if (!found) return null;
  const { el, rect } = found;
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom || rect.width === 0) return null;
  const scale = rect.width / (el.offsetWidth || rect.width);
  return { x: (x - rect.left) / scale, y: (y - rect.top) / scale };
}

function hintOf(drop: DropAt | null): DropHint | null {
  if (!drop?.selection) return null;
  if (!drop.selection.source && !drop.selection.owners?.length) return { text: 'This element has no source location', ok: false };
  return { text: drop.inside ? `Insert into ${drop.label}` : `Insert after ${drop.label}`, ok: true };
}

export function useComponentInsert(o: Options): void {
  const live = useRef(o);
  live.current = o;
  const busy = useRef(false);
  const drop = useRef<DropAt | null>(null);
  const pending = useRef<{ id: string; onHint: (hint: DropHint | null) => void } | null>(null);
  const reselect = useRef<{ selector: string; name: string; target: string; until: number; timer: number } | null>(null);
  const seq = useRef(0);

  const stopReselect = useCallback(() => {
    if (reselect.current) window.clearInterval(reselect.current.timer);
    reselect.current = null;
  }, []);

  const startReselect = useCallback(
    (selector: string, name: string, target: string) => {
      stopReselect();
      const tick = () => {
        const job = reselect.current;
        if (!job) return;
        const last = live.current.selection.at(-1);
        const landed = last && last.selector !== job.target && last.owners?.[0]?.name === job.name;
        if (landed || Date.now() > job.until) return stopReselect();
        live.current.frames.post({ type: 'select-selector', selector: job.selector });
      };
      reselect.current = { selector, name, target, until: Date.now() + RESELECT_FOR_MS, timer: window.setInterval(tick, RESELECT_EVERY_MS) };
    },
    [stopReselect],
  );

  useEffect(() => stopReselect, [stopReselect]);

  const run = useCallback(
    async (component: InsertableComponent, position: InsertPosition, selection: SelectionContext | undefined) => {
      const cur = live.current;
      if (!cur.enabled || !cur.directionId) return cur.notify('Edits are paused here. Wait for the run to finish, or open the latest version.');
      if (!selection) return cur.notify('Select an element first, then insert the component inside or after it.');
      const target = targetOf(selection);
      if (!target) return cur.notify(NO_SOURCE);
      if (busy.current) return;
      busy.current = true;
      try {
        await insertApi.insert(cur.projectId, cur.directionId, { component: { name: component.name, file: component.file }, target, position });
        startReselect(newSelector(selection.selector, position), component.name, selection.selector);
      } catch (error) {
        live.current.notify(insertError(error));
      } finally {
        busy.current = false;
      }
    },
    [startReselect],
  );

  useBridge(
    () =>
      live.current.frames.slots.map((slot): BridgeFrame => ({ key: slot.token, token: slot.token, url: slot.src, kind: live.current.kind, element: live.current.frames.elements.current[slot.token] ?? null })),
    (frame, msg: BridgeToParent) => {
      if (msg.type !== 'element-at' || frame.token !== live.current.frames.frontToken) return;
      const wait = pending.current;
      if (!wait || wait.id !== msg.requestId) return;
      drop.current = { requestId: msg.requestId, selection: msg.selection, inside: msg.inside, label: msg.label };
      wait.onHint(hintOf(drop.current));
    },
  );

  const host = useMemo<InsertHost>(
    () => ({
      insert: (component, position) => void run(component, position, live.current.selection.at(-1)),
      dragMove(x, y, onHint) {
        const point = localPoint(live.current.frames, x, y);
        if (!point) {
          drop.current = null;
          onHint(null);
          return;
        }
        const id = `drop-${++seq.current}`;
        pending.current = { id, onHint };
        live.current.frames.post({ type: 'element-at', requestId: id, x: point.x, y: point.y });
      },
      dragEnd(component, x, y) {
        const last = drop.current;
        drop.current = null;
        pending.current = null;
        if (!localPoint(live.current.frames, x, y)) return;
        if (!last?.selection) return live.current.notify('Drop the component on an element in the frame.');
        void run(component, last.inside ? 'inside' : 'after', last.selection);
      },
    }),
    [run],
  );

  useEffect(() => {
    insertBus.set(host);
    return () => insertBus.clear(host);
  }, [host]);
}
