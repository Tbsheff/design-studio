import { Icon } from "@design-studio/ui";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { FRAME_PRESETS } from "./canvas-frame-ops.js";
import { copy } from "./copy.js";

const SET_TIMEOUT_8000 = 8000;

const AddFrameMenu = ({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (size: { width: number; height: number }) => void;
}): ReactElement => {
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

    const onDown = (event: MouseEvent): void => {
      const target = event.target as Node;

      if (
        !menu.current?.contains(target) &&
        !button.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);

    return (): void => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = (refocus: boolean): void => {
    setOpen(false);

    if (refocus) {
      button.current?.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
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

    const next: number | null = ((): number | null => {
      if (event.key === "ArrowDown") {
        return index + 1;
      }
      if (event.key === "ArrowUp") {
        return index - 1;
      }
      if (event.key === "Home") {
        return 0;
      }
      if (event.key === "End") {
        return items.length - 1;
      }

      return null;
    })();

    if (next === null) {
      return;
    }

    event.preventDefault();
    items[(next + items.length) % items.length]?.focus();
  };

  const datatip: "Add frame" | "Frame limit reached" | undefined = (():
    | "Add frame"
    | "Frame limit reached"
    | undefined => {
    if (open) {
      return undefined;
    }
    if (disabled) {
      return "Frame limit reached";
    }

    return "Add frame";
  })();

  return (
    <div className="add-frame">
      <button
        ref={button}
        type="button"
        className="icon-btn"
        aria-label={copy.addFrame}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tip={datatip}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="frame" />
      </button>
      {open && (
        <div
          ref={menu}
          className="project-menu canvas-menu"
          role="menu"
          aria-label={copy.addFrame}
          onKeyDown={onKeyDown}
        >
          {FRAME_PRESETS.map((framePreset) => (
            <button
              key={framePreset.preset}
              type="button"
              role="menuitem"
              onClick={() => {
                close(true);
                onAdd({ height: framePreset.height, width: framePreset.width });
              }}
            >
              <Icon name={framePreset.preset} size={14} />
              <span>{framePreset.label}</span>
              <kbd aria-hidden="true">
                {framePreset.width}
                {copy.times2}
                {framePreset.height}
              </kbd>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FrameUndoBar = ({
  onUndo,
  onDismiss,
}: {
  onUndo: (() => void) | null;
  onDismiss: () => void;
}): ReactElement | null => {
  useEffect(() => {
    if (!onUndo) {
      return;
    }

    const timer = globalThis.setTimeout(onDismiss, SET_TIMEOUT_8000);

    return (): void => globalThis.clearTimeout(timer);
  }, [onUndo, onDismiss]);

  if (!onUndo) {
    return null;
  }

  return (
    <div className="frame-undo" role="status">
      <span>{copy.frameRemoved}</span>
      <button type="button" className="link" onClick={onUndo}>
        {copy.undo}
      </button>
    </div>
  );
};

export { AddFrameMenu, FrameUndoBar };
