import { memo, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { FRAME_PRESETS, frameName, type CanvasFrame } from '../canvasFrames';
import { FrameResizeHandles, type ResizeEdge } from './FrameControls';
import { FlowFromHere } from './FlowFromHere';
import { FrameStateMenu } from './FrameStateMenu';
import { FrameSkeleton } from './FrameSkeleton';
import { pageFileOf } from '../useFirstBuild';
import { Icon } from './Icon';
import { PREVIEW_PAINTED_EVENT } from '../useEditHistory';

export interface FrameBadge {
  label: string;
  title: string;
  current: boolean;
}

interface LabelProps {
  frame: CanvasFrame;
  active: boolean;
  removable: boolean;
  directionId: string | null;
  badge?: FrameBadge;
  number?: string;
  title?: string;
  extras?: ReactNode;
  onPointerDown: (e: ReactPointerEvent, frame: CanvasFrame) => void;
  onBodyPointerDown?: (e: ReactPointerEvent, frame: CanvasFrame, body: boolean) => void;
  onActivate: (frame: CanvasFrame) => void;
  onRemove: (frame: CanvasFrame) => void;
  onNudge: (frame: CanvasFrame, dx: number, dy: number) => void;
  onResizeStart: (e: ReactPointerEvent, frame: CanvasFrame, edge: ResizeEdge) => void;
}

const NUDGE: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

export function FrameLabel({ frame, active, removable, directionId, badge, number, title, extras, onPointerDown, onActivate, onRemove, onNudge }: LabelProps) {
  const size = frameName(frame);
  const name = badge ? `Variation ${badge.label}` : size;
  const classes = ['frame-label', active ? 'active' : '', badge ? 'variation' : '', badge?.current ? 'current' : ''].filter(Boolean).join(' ');
  return (
    <div className={classes} data-frame-id={frame.id} data-direction-id={directionId ?? undefined} data-testid={badge ? 'variation-frame' : undefined} style={{ '--frame-w': `${frame.width}px` } as CSSProperties}>
      <button
        type="button"
        className="frame-name"
        aria-pressed={active}
        aria-label={`${name} frame`}
        data-tip={active ? `${badge ? `${size} · ` : ''}Drag to move, double-click to zoom` : `${badge ? `${size} · ` : ''}Click to edit, double-click to zoom`}
        onPointerDown={(e) => onPointerDown(e, frame)}
        onKeyDown={(e) => {
          const step = NUDGE[e.key];
          if (step) {
            e.preventDefault();
            const size = e.shiftKey ? 100 : 10;
            onNudge(frame, step[0] * size, step[1] * size);
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate(frame);
          }
        }}
      >
        {number && <span className="frame-number">{number}</span>}
        <span className="frame-title">{badge ? badge.title : (title ?? size)}</span>
        {!badge && title && <span className="frame-size">{size}</span>}
      </button>
      <FrameStateMenu frameId={frame.id} frameName={name} />
      {!badge && <FlowFromHere frameId={frame.id} frameName={name} />}
      {extras}
      {removable && (
        <button type="button" className="frame-remove" aria-label={`Remove ${name} frame`} data-tip="Remove frame" onClick={() => onRemove(frame)}>
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}

const MOUNT_FALLBACK_MS = 1200;
let frontPainted = false;
let paintListening = false;

export function useResetPassiveGateInFirstRender(): void {
  useState(resetPassiveMountGate);
}

function resetPassiveMountGate(): void {
  frontPainted = false;
  if (paintListening || typeof window === 'undefined') return;
  paintListening = true;
  window.addEventListener(PREVIEW_PAINTED_EVENT, () => {
    frontPainted = true;
  });
}

function usePassiveMount(ref: RefObject<HTMLDivElement | null>): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (armed || !el) return;
    let front = frontPainted;
    let seen = false;
    const tryArm = () => {
      if (front && seen) setArmed(true);
    };
    const onPaint = () => {
      front = true;
      tryArm();
    };
    window.addEventListener(PREVIEW_PAINTED_EVENT, onPaint);
    const timer = window.setTimeout(onPaint, MOUNT_FALLBACK_MS);
    const root = el.closest('.stage');
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        seen = true;
        tryArm();
      },
      { root, rootMargin: '50%' },
    );
    io.observe(el);
    return () => {
      window.removeEventListener(PREVIEW_PAINTED_EVENT, onPaint);
      window.clearTimeout(timer);
      io.disconnect();
    };
  }, [armed, ref]);
  return armed;
}

interface PassiveProps {
  frame: CanvasFrame;
  src: string | null;
  nextSrc: string | null;
  pending?: { step: string | null; missing: boolean };
  sandbox?: string;
  offset: { x: number; y: number };
  label: LabelProps;
  register: (id: string, el: HTMLDivElement | null) => void;
  frameRef?: (el: HTMLIFrameElement | null) => void;
  onNextLoad: (id: string) => void;
}

export function PassiveFrame({ frame, src, nextSrc, pending, sandbox, offset, label, register, frameRef, onNextLoad }: PassiveProps) {
  const name = label.badge ? `Variation ${label.badge.label}` : frameName(frame);
  const box = useRef<HTMLDivElement | null>(null);
  const armed = usePassiveMount(box);
  return (
    <div
      ref={(el) => {
        box.current = el;
        register(frame.id, el);
      }}
      className="canvas-frame"
      data-frame-id={frame.id}
      data-direction-id={label.directionId ?? undefined}
      style={{ left: frame.x - offset.x, top: frame.y - offset.y, width: frame.width, height: frame.height }}
    >
      {(armed ? [src, nextSrc] : []).map((url, index) =>
        url ? (
          <iframe
            key={url}
            ref={index === 0 ? frameRef : undefined}
            title={`${name} preview`}
            className={index === 0 ? 'frame passive' : 'frame passive next'}
            src={url}
            sandbox={sandbox}
            width={frame.width}
            height={frame.height}
            tabIndex={-1}
            onLoad={index === 0 ? undefined : () => onNextLoad(frame.id)}
          />
        ) : null,
      )}
      {pending && <FrameSkeleton step={pending.step} page={pageFileOf(frame.path)} missing={pending.missing ? pageFileOf(frame.path) : undefined} />}
      <div className="frame-hit" aria-hidden="true" onPointerDown={(e) => (label.onBodyPointerDown ? label.onBodyPointerDown(e, frame, true) : label.onPointerDown(e, frame))} />
      <FrameLabel {...label} />
      <FrameResizeHandles onPointerDown={(e, edge) => label.onResizeStart(e, frame, edge)} />
    </div>
  );
}

export type PassiveEntry = PassiveProps;

function liveLabel(cur: LabelProps, live: () => LabelProps): LabelProps {
  return {
    ...cur,
    onPointerDown: (e, f) => live().onPointerDown(e, f),
    onBodyPointerDown: cur.onBodyPointerDown ? (e, f, body) => live().onBodyPointerDown?.(e, f, body) : undefined,
    onActivate: (f) => live().onActivate(f),
    onRemove: (f) => live().onRemove(f),
    onNudge: (f, dx, dy) => live().onNudge(f, dx, dy),
    onResizeStart: (e, f, edge) => live().onResizeStart(e, f, edge),
  };
}

export const StablePassiveFrame = memo(
  function StablePassiveFrame({ id, entries }: { id: string; sig: string; entries: RefObject<Map<string, PassiveEntry>> }) {
    const cur = entries.current.get(id);
    if (!cur) return null;
    const live = () => entries.current.get(id) ?? cur;
    return <PassiveFrame {...cur} label={liveLabel(cur.label, () => live().label)} onNextLoad={(frameId) => live().onNextLoad(frameId)} />;
  },
  (a, b) => a.sig === b.sig && a.entries === b.entries && a.id === b.id,
);

export function AddFrameMenu({ disabled, onAdd }: { disabled: boolean; onAdd: (size: { width: number; height: number }) => void }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    const next = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    items[(next + items.length) % items.length]?.focus();
  };
  return (
    <div className="add-frame">
      <button
        ref={button}
        type="button"
        className="icon-btn"
        aria-label="Add frame"
        aria-haspopup="menu"
        aria-expanded={open}
        data-tip={open ? undefined : disabled ? 'Frame limit reached' : 'Add frame'}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="frame" />
      </button>
      {open && (
        <div ref={menu} className="project-menu canvas-menu" role="menu" aria-label="Add frame" onKeyDown={onKeyDown}>
          {FRAME_PRESETS.map((p) => (
            <button
              key={p.preset}
              type="button"
              role="menuitem"
              onClick={() => {
                close(true);
                onAdd({ width: p.width, height: p.height });
              }}
            >
              <Icon name={p.preset} size={14} />
              <span>{p.label}</span>
              <kbd aria-hidden="true">
                {p.width} × {p.height}
              </kbd>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FrameUndoBar({ onUndo, onDismiss }: { onUndo: (() => void) | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!onUndo) return;
    const timer = window.setTimeout(onDismiss, 8000);
    return () => window.clearTimeout(timer);
  }, [onUndo, onDismiss]);
  if (!onUndo) return null;
  return (
    <div className="frame-undo" role="status">
      <span>Frame removed.</span>
      <button type="button" className="link" onClick={onUndo}>
        Undo
      </button>
    </div>
  );
}
