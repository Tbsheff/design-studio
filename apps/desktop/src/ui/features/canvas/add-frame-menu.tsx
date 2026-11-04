import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { Icon } from "../../kit/Icon.js";
import { FRAME_PRESETS } from "./canvas-frames-model.js";

export function AddFrameMenu({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (size: { width: number; height: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) {
      return;
    }
    menu.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
      ?.focus();

    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        !menu.current?.contains(target) &&
        !button.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);

    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      button.current?.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [
      ...(menu.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]'
      ) ?? []),
    ];

    const index = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      close(true);

      return;
    }

    const next =
      event.key === "ArrowDown"
        ? index + 1
        : event.key === "ArrowUp"
          ? index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : null;

    if (next === null) {
      return;
    }
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
        data-tip={
          open ? undefined : disabled ? "Frame limit reached" : "Add frame"
        }
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="frame" />
      </button>
      {open && (
        <div
          ref={menu}
          className="project-menu canvas-menu"
          role="menu"
          aria-label="Add frame"
          onKeyDown={onKeyDown}
        >
          {FRAME_PRESETS.map((p) => (
            <button
              key={p.preset}
              type="button"
              role="menuitem"
              onClick={() => {
                close(true);
                onAdd({ height: p.height, width: p.width });
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

export function FrameUndoBar({
  onUndo,
  onDismiss,
}: {
  onUndo: (() => void) | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!onUndo) {
      return;
    }
    const timer = window.setTimeout(onDismiss, 8000);

    return () => window.clearTimeout(timer);
  }, [onUndo, onDismiss]);

  if (!onUndo) {
    return null;
  }
  return (
    <div className="frame-undo" role="status">
      <span>Frame removed.</span>
      <button type="button" className="link" onClick={onUndo}>
        Undo
      </button>
    </div>
  );
}
