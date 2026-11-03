import { useEffect, useRef } from "react";

export const PREVIEW_ESCAPE_EVENT = "studio:preview-escape";
export const PREVIEW_STOP_EVENT = "studio:preview-stop";

const OVERLAY_SELECTOR = 'dialog[open], [role="dialog"][aria-modal="true"]';

function isStopKey(event: KeyboardEvent): boolean {
  return (
    event.key === "." &&
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey
  );
}

function overlayOpen(): boolean {
  return Array.from(
    document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR)
  ).some((element) => element.getClientRects().length > 0);
}

export function useEscapeStop(active: boolean, onStop: () => void): void {
  const stop = useRef(onStop);
  stop.current = onStop;
  useEffect(() => {
    if (!active) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (
        !isStopKey(event) ||
        event.defaultPrevented ||
        event.repeat ||
        overlayOpen()
      ) {
        return;
      }

      event.preventDefault();
      stop.current();
    };

    const onFrameStop = () => {
      if (!overlayOpen()) {
        stop.current();
      }
    };

    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener(PREVIEW_STOP_EVENT, onFrameStop);

    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener(PREVIEW_STOP_EVENT, onFrameStop);
    };
  }, [active]);
}
