import { useEffect, useLayoutEffect, useRef, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';

function modalDialogOwnsEscape(popover: HTMLElement | null): boolean {
  const modal = document.querySelector('dialog[open]');
  return modal !== null && popover !== null && !modal.contains(popover);
}

export function usePopover(
  open: boolean,
  root: RefObject<HTMLElement | null>,
  onClose: (refocus: boolean) => void,
  trigger?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (trigger?.current?.contains(target)) return;
      if (root.current && !root.current.contains(target)) onClose(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modalDialogOwnsEscape(root.current)) return;
      e.preventDefault();
      e.stopPropagation();
      onClose(true);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, root, onClose, trigger]);
}

const FOCUSABLE = 'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

function firstFocusable(root: Element | null): HTMLElement | null {
  return root?.querySelector<HTMLElement>(FOCUSABLE) ?? null;
}

export function useReturnFocusOnUnmount(): void {
  useLayoutEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);
}

export function useModalDialog(onDismiss: () => boolean | void) {
  const ref = useRef<HTMLDialogElement>(null);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!el.open) el.showModal();
    (el.querySelector<HTMLElement>('[data-autofocus]') ?? firstFocusable(el.querySelector('.modal-body')) ?? firstFocusable(el))?.focus();
    const onCancel = (e: Event) => {
      e.preventDefault();
      dismiss.current();
    };
    const onClose = () => {
      if (dismiss.current() === false && el.isConnected) el.showModal();
    };
    el.addEventListener('cancel', onCancel);
    el.addEventListener('close', onClose);
    return () => {
      el.removeEventListener('cancel', onCancel);
      el.removeEventListener('close', onClose);
      if (el.open) el.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  const onBackdropMouseDown = (e: ReactMouseEvent<HTMLDialogElement>) => {
    if (e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dismiss.current();
  };

  return { ref, onMouseDown: onBackdropMouseDown };
}
