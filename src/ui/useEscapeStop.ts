import { useEffect, useRef } from 'react';

export const PREVIEW_ESCAPE_EVENT = 'studio:preview-escape';

const OVERLAY_SELECTOR = 'dialog[open], [role="dialog"], [role="menu"], [role="listbox"], [data-esc-owner]';

function fieldOwnsEscape(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.matches('.prompt [data-slot="composer-input"]')) return false;
  return target.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

function overlayOpen(): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR)).some((element) => element.getClientRects().length > 0);
}

export function useEscapeStop(active: boolean, onStop: () => void): void {
  const stop = useRef(onStop);
  stop.current = onStop;
  useEffect(() => {
    if (!active) return;
    const fromStudio = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (fieldOwnsEscape(event.target) || overlayOpen()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      stop.current();
    };
    const fromPreview = () => {
      if (!overlayOpen()) stop.current();
    };
    window.addEventListener('keydown', fromStudio, { capture: true });
    window.addEventListener(PREVIEW_ESCAPE_EVENT, fromPreview);
    return () => {
      window.removeEventListener('keydown', fromStudio, { capture: true });
      window.removeEventListener(PREVIEW_ESCAPE_EVENT, fromPreview);
    };
  }, [active]);
}
