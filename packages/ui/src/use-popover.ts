import { useEffect, useLayoutEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent, RefObject } from "react";

const modalDialogOwnsEscape = (popover: HTMLElement | null): boolean => {
  const modal = document.querySelector("dialog[open]");

  return modal !== null && popover !== null && !modal.contains(popover);
};

const usePopover = (
  open: boolean,
  root: RefObject<HTMLElement | null>,
  onClose: (refocus: boolean) => void,
  trigger?: RefObject<HTMLElement | null>
): void => {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onDown = (event: MouseEvent): void => {
      const target = event.target as Node;

      if (trigger?.current?.contains(target)) {
        return;
      }

      if (root.current && !root.current.contains(target)) {
        onClose(false);
      }
    };

    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      if (modalDialogOwnsEscape(root.current)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    };

    document.addEventListener("mousedown", onDown);
    globalThis.addEventListener("keydown", onKey, true);

    return (): void => {
      document.removeEventListener("mousedown", onDown);
      globalThis.removeEventListener("keydown", onKey, true);
    };
  }, [open, root, onClose, trigger]);
};

const FOCUSABLE =
  'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

const firstFocusable = (root: Element | null): HTMLElement | null =>
  root?.querySelector<HTMLElement>(FOCUSABLE) ?? null;

const useReturnFocusOnUnmount = (): void => {
  useLayoutEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    return (): void => {
      if (opener?.isConnected) {
        opener.focus();
      }
    };
  }, []);
};

const useModalDialog = (
  onDismiss: () => boolean | void
): {
  onMouseDown: (event: ReactMouseEvent<HTMLDialogElement>) => void;
  ref: RefObject<HTMLDialogElement | null>;
} => {
  const ref = useRef<HTMLDialogElement>(null);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    if (!el.open) {
      el.showModal();
    }

    (
      el.querySelector<HTMLElement>("[data-autofocus]") ??
      firstFocusable(el.querySelector(".modal-body")) ??
      firstFocusable(el)
    )?.focus();

    const onCancel = (event: Event): void => {
      event.preventDefault();
      dismiss.current();
    };

    const onClose = (): void => {
      if (dismiss.current() === false && el.isConnected) {
        el.showModal();
      }
    };

    el.addEventListener("cancel", onCancel);
    el.addEventListener("close", onClose);

    return (): void => {
      el.removeEventListener("cancel", onCancel);
      el.removeEventListener("close", onClose);

      if (el.open) {
        el.close();
      }

      if (opener?.isConnected) {
        opener.focus();
      }
    };
  }, []);

  const onBackdropMouseDown = (
    event: ReactMouseEvent<HTMLDialogElement>
  ): void => {
    if (event.target !== event.currentTarget) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!inside) {
      dismiss.current();
    }
  };

  return { onMouseDown: onBackdropMouseDown, ref };
};

export { usePopover, useReturnFocusOnUnmount, useModalDialog };
