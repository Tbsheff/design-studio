import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { FRAME_PRESETS, frameName, type CanvasFrame } from '../canvasFrames';
import { FrameResizeHandles, type ResizeEdge } from './FrameControls';
import { Icon } from './Icon';

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
  extras?: ReactNode;
  onPointerDown: (e: ReactPointerEvent, frame: CanvasFrame) => void;
  onActivate: (frame: CanvasFrame) => void;
  onRemove: (frame: CanvasFrame) => void;
  onNudge: (frame: CanvasFrame, dx: number, dy: number) => void;
  onResizeStart: (e: ReactPointerEvent, frame: CanvasFrame, edge: ResizeEdge) => void;
}

const NUDGE: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

export function FrameLabel({ frame, active, removable, directionId, badge, extras, onPointerDown, onActivate, onRemove, onNudge }: LabelProps) {
  const size = frameName(frame);
  const name = badge ? `Variation ${badge.label}` : size;
  const classes = ['frame-label', active ? 'active' : '', badge ? 'variation' : '', badge?.current ? 'current' : ''].filter(Boolean).join(' ');
  return (
    <div className={classes} data-frame-id={frame.id} data-direction-id={directionId ?? undefined} data-testid={badge ? 'variation-frame' : undefined}>
      <button
        type="button"
        className="frame-name"
        aria-pressed={active}
        aria-label={`${name} frame`}
        data-tip={active ? `${badge ? `${size} · ` : ''}Drag or use arrow keys to move` : `${badge ? `${size} · ` : ''}Click to edit, drag to move`}
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
        {badge ? (
          <>
            <span className="badge accent">{badge.label}</span>
            <span className="frame-title">{badge.title}</span>
          </>
        ) : (
          size
        )}
      </button>
      {extras}
      {removable && (
        <button type="button" className="frame-remove" aria-label={`Remove ${name} frame`} data-tip="Remove frame" onClick={() => onRemove(frame)}>
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}

interface PassiveProps {
  frame: CanvasFrame;
  src: string | null;
  nextSrc: string | null;
  sandbox?: string;
  offset: { x: number; y: number };
  label: LabelProps;
  register: (id: string, el: HTMLDivElement | null) => void;
  frameRef?: (el: HTMLIFrameElement | null) => void;
  onNextLoad: (id: string) => void;
}

export function PassiveFrame({ frame, src, nextSrc, sandbox, offset, label, register, frameRef, onNextLoad }: PassiveProps) {
  const name = label.badge ? `Variation ${label.badge.label}` : frameName(frame);
  return (
    <div
      ref={(el) => register(frame.id, el)}
      className="canvas-frame"
      data-frame-id={frame.id}
      data-direction-id={label.directionId ?? undefined}
      style={{ left: frame.x - offset.x, top: frame.y - offset.y, width: frame.width, height: frame.height }}
    >
      {[src, nextSrc].map((url, index) =>
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
      <div className="frame-hit" aria-hidden="true" onPointerDown={(e) => label.onPointerDown(e, frame)} />
      <FrameLabel {...label} />
      <FrameResizeHandles onPointerDown={(e, edge) => label.onResizeStart(e, frame, edge)} />
    </div>
  );
}

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
