import { useFitPopover, usePopover } from "@design-studio/ui";
import { useEffect, useEffectEvent, useRef } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";

import { findElement } from "../../platform/find-element.js";
import { FOCUS_ITEMS } from "./popover-focus-model.js";

type Close = (refocus: boolean) => void;

const CHECKED_ITEM = '[aria-checked="true"], [aria-pressed="true"]';

interface PopProps {
  readonly trigger: RefObject<HTMLElement | null>;
  readonly onClose: Close;
  readonly variant: string;
  readonly label: string;
  readonly role?: "dialog" | "menu";
  readonly children: ReactNode;
  readonly onKeyDown?: (event: KeyboardEvent) => void;
  readonly closing?: boolean;
}

const Pop = ({
  trigger,
  onClose,
  variant,
  label,
  role = "dialog",
  children,
  onKeyDown,
  closing = false,
}: PopProps): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  usePopover(!closing, root, onClose, trigger);
  useFitPopover(root, trigger, true);

  useEffect(() => {
    const { current } = root;

    if (!current) {
      return;
    }

    const first =
      findElement(current, CHECKED_ITEM) ?? findElement(current, FOCUS_ITEMS);

    first?.focus();
  }, []);

  const handleKey = useEffectEvent((event: KeyboardEvent): void => {
    if (event.key === "Tab" && role === "menu") {
      event.preventDefault();
      onClose(true);
    }

    onKeyDown?.(event);
  });

  useEffect(() => {
    const { current } = root;

    if (!current) {
      return;
    }

    current.addEventListener("keydown", handleKey);

    return (): void => current.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div
      ref={root}
      className={`ui-popover home-pop ${variant}`}
      role={role}
      aria-label={label}
      data-closing={closing || null}
      inert={closing}
    >
      {children}
    </div>
  );
};

export { Pop };

export type { Close };
