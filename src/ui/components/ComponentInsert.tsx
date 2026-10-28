import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { SelectionContext } from '../../shared/contracts';
import type { InsertPosition, InsertableComponent, InsertableList } from '../../shared/insert';
import { insertApi, insertBus, insertError, type DropHint } from '../componentInsert';
import { NO_SOURCE } from '../structureEdits';
import { PreviewMenu, type PreviewMenuItem } from './PreviewMenu';

const DRAG_START_PX = 4;

export function useInsertable(projectId: string, directionId: string | null, enabled: boolean, version: string) {
  const [state, setState] = useState<{ list: InsertableList | null; error: string | null }>({ list: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled || !directionId) return;
    let live = true;
    insertApi.list(projectId, directionId).then(
      (list) => live && setState({ list, error: null }),
      (error: unknown) => live && setState((prev) => ({ ...prev, error: insertError(error) })),
    );
    return () => {
      live = false;
    };
  }, [projectId, directionId, enabled, version, attempt]);
  useEffect(() => setState({ list: null, error: null }), [projectId, directionId]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

interface Drag {
  component: InsertableComponent;
  pointerId: number;
  startX: number;
  startY: number;
  active: boolean;
}

export interface ComponentDrag {
  ghost: { name: string; x: number; y: number; hint: DropHint | null } | null;
  handlers: (component: InsertableComponent) => {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
    onClickCapture: (event: React.MouseEvent) => void;
  };
}

export function useComponentDrag(): ComponentDrag {
  const drag = useRef<Drag | null>(null);
  const dragged = useRef(false);
  const frame = useRef(0);
  const [ghost, setGhost] = useState<ComponentDrag['ghost']>(null);
  const cancel = useCallback(() => {
    drag.current = null;
    setGhost(null);
  }, []);
  useEffect(() => {
    if (!ghost) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && cancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ghost, cancel]);
  const handlers = (component: InsertableComponent) => ({
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      dragged.current = false;
      drag.current = { component, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, active: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      const cur = drag.current;
      if (!cur || cur.pointerId !== event.pointerId) return;
      if (!cur.active && Math.hypot(event.clientX - cur.startX, event.clientY - cur.startY) < DRAG_START_PX) return;
      cur.active = true;
      const { clientX: x, clientY: y } = event;
      setGhost((prev) => ({ name: component.name, x, y, hint: prev?.hint ?? null }));
      if (frame.current) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = 0;
        insertBus.get()?.dragMove(x, y, (hint) => setGhost((prev) => (prev ? { ...prev, hint } : prev)));
      });
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      const cur = drag.current;
      drag.current = null;
      setGhost(null);
      if (!cur?.active) return;
      dragged.current = true;
      insertBus.get()?.dragEnd(cur.component, event.clientX, event.clientY);
    },
    onPointerCancel: cancel,
    onClickCapture(event: React.MouseEvent) {
      if (!dragged.current) return;
      dragged.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  });
  return { ghost, handlers };
}

export function DragGhost({ ghost }: { ghost: ComponentDrag['ghost'] }) {
  if (!ghost) return null;
  return createPortal(
    <div className="cmp-ghost" style={{ left: ghost.x + 12, top: ghost.y + 12 }} role="status" aria-live="polite">
      <span className="cmp-ghost-name">{ghost.name}</span>
      <span className={`cmp-ghost-hint${ghost.hint && !ghost.hint.ok ? ' bad' : ''}`}>{ghost.hint?.text ?? 'Drop on an element in the frame'}</span>
    </div>,
    document.body,
  );
}

function blockReason(selection: SelectionContext | undefined): string | undefined {
  if (!selection) return 'Select an element on the canvas first.';
  if (!selection.source && !selection.owners?.length) return NO_SOURCE;
  return undefined;
}

export function InsertMenu({ component, at, selection, onClose }: { component: InsertableComponent; at: { x: number; y: number }; selection: SelectionContext | undefined; onClose: () => void }) {
  const disabled = blockReason(selection);
  const tag = selection?.tag.toLowerCase() ?? 'selection';
  const run = (position: InsertPosition) => () => insertBus.get()?.insert(component, position);
  const items: PreviewMenuItem[] = [
    { id: 'insert-inside', label: `Insert inside ${tag}`, icon: 'frame', run: run('inside'), ...(disabled ? { disabled } : {}) },
    { id: 'insert-after', label: `Insert after ${tag}`, icon: 'arrowDown', run: run('after'), ...(disabled ? { disabled } : {}) },
  ];
  return <PreviewMenu at={at} label={`Insert ${component.name}`} items={items} onClose={onClose} />;
}
