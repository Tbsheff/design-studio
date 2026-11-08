import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import type { KeyId } from "../../../shared/keymap.js";
import { KeyHint } from "../../canvas-preview-slots.js";

const INDEX_1 = 1;

const STEP_0 = 0;

const COUNT_1 = 1;

const EDGE_2 = 2;

interface PreviewMenuItem {
  id: string;
  label: string;
  icon: IconName;
  keyId?: KeyId;
  run: () => void | Promise<unknown>;
  hidden?: boolean;
  disabled?: string;
  divider?: boolean;
}

const EDGE = 8;

const step = (key: string, index: number, count: number): number | null => {
  if (key === "ArrowDown") {
    return (index + INDEX_1) % count;
  }

  if (key === "ArrowUp") {
    return (index - INDEX_1 + count) % count;
  }

  if (key === "Home") {
    return STEP_0;
  }

  if (key === "End") {
    return count - COUNT_1;
  }

  return null;
};

const MenuRow = ({
  item,
  onClose,
}: {
  item: PreviewMenuItem;
  onClose: () => void;
}): ReactElement => {
  const ariadisabled: true | undefined = ((): true | undefined => {
    if (!item.disabled) {
      return undefined;
    }
    return true;
  })();

  let content: ReactNode = <span />;

  if (item.keyId) {
    content = <KeyHint id={item.keyId} />;
  }

  return (
    <>
      {item.divider && (
        <div className="preview-menu-divider" role="separator" />
      )}
      <button
        type="button"
        role="menuitem"
        aria-disabled={ariadisabled}
        data-tip={item.disabled}
        data-tip-align="end"
        onClick={() => {
          if (item.disabled) {
            return;
          }

          onClose();
          void item.run();
        }}
      >
        <Icon name={item.icon} size={14} />
        <span>{item.label}</span>
        {content}
      </button>
    </>
  );
};

const PreviewMenu = ({
  at,
  label,
  items,
  onClose,
}: {
  at: { x: number; y: number };
  label: string;
  items: PreviewMenuItem[];
  onClose: () => void;
}): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(at);
  const [scrolls, setScrolls] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    const clamp = (): void => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      const last = el.lastElementChild as HTMLElement | null;

      let operand: number = height;

      if (last) {
        operand = last.offsetTop + last.offsetHeight;
      }

      setScrolls(operand > window.innerHeight - EDGE * EDGE_2);
      setPos({
        x: Math.max(EDGE, Math.min(at.x, window.innerWidth - width - EDGE)),
        y: Math.max(EDGE, Math.min(at.y, window.innerHeight - height - EDGE)),
      });
    };

    clamp();
    el.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus({
      preventScroll: true,
    });
    const observer = new ResizeObserver(clamp);
    observer.observe(el);

    return (): void => observer.disconnect();
  }, [at]);

  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    globalThis.addEventListener("mousedown", onDown, true);
    window.addEventListener("blur", onClose);
    window.addEventListener("resize", onClose);

    return (): void => {
      globalThis.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      onClose();

      return;
    }

    const buttons = [
      ...(ref.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]'
      ) ?? []),
    ];

    const next = step(
      event.key,
      buttons.indexOf(document.activeElement as HTMLButtonElement),
      buttons.length
    );

    if (next === null) {
      return;
    }

    event.preventDefault();
    buttons[next]?.focus();
  };

  let part: "" | " scrolls" = "";

  if (scrolls) {
    part = " scrolls";
  }

  return (
    <div
      ref={ref}
      className={`project-menu at-pointer preview-menu${part}`}
      role="menu"
      aria-label={label}
      style={{ left: pos.x, position: "fixed", right: "auto", top: pos.y }}
      onKeyDown={onKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <MenuRow key={item.id} item={item} onClose={onClose} />
        ))}
    </div>
  );
};

export { PreviewMenu };

export type { PreviewMenuItem };
