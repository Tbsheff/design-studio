import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { FRAME_PRESETS, frameName, type CanvasFrame } from '../canvasFrames';
import { Icon } from './Icon';

interface LabelProps {
  frame: CanvasFrame;
  active: boolean;
  removable: boolean;
  onPointerDown: (e: ReactPointerEvent, frame: CanvasFrame) => void;
  onActivate: (frame: CanvasFrame) => void;
  onRemove: (frame: CanvasFrame) => void;
}

export function FrameLabel({ frame, active, removable, onPointerDown, onActivate, onRemove }: LabelProps) {
  const name = frameName(frame);
  return (
    <div className={`frame-label${active ? ' active' : ''}`} data-frame-id={frame.id}>
      <button
        type="button"
        className="frame-name"
        aria-pressed={active}
        aria-label={`${name} frame`}
        data-tip={active ? 'Drag to move' : 'Click to edit, drag to move'}
        onPointerDown={(e) => onPointerDown(e, frame)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate(frame);
          }
        }}
      >
        {name}
      </button>
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
  sandbox?: string;
  offset: { x: number; y: number };
  label: LabelProps;
  register: (id: string, el: HTMLDivElement | null) => void;
}

export function PassiveFrame({ frame, src, sandbox, offset, label, register }: PassiveProps) {
  const name = frameName(frame);
  return (
    <div
      ref={(el) => register(frame.id, el)}
      className="canvas-frame"
      data-frame-id={frame.id}
      style={{ left: frame.x - offset.x, top: frame.y - offset.y, width: frame.width, height: frame.height }}
    >
      {src && <iframe title={`${name} preview`} className="frame passive" src={src} sandbox={sandbox} width={frame.width} height={frame.height} tabIndex={-1} />}
      <div className="frame-hit" aria-hidden="true" onPointerDown={(e) => label.onPointerDown(e, frame)} />
      <FrameLabel {...label} />
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
