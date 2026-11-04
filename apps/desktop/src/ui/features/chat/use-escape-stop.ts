import { useEffect, useRef } from "react";

export const PREVIEW_ESCAPE_EVENT = "studio:preview-escape";
export const PREVIEW_STOP_EVENT = "studio:preview-stop";

const OVERLAY_SELECTOR = 'dialog[open], [role="dialog"][aria-modal="true"]';

const isStopKey = (event: KeyboardEvent): boolean =>
  event.key === "." &&
  (event.metaKey || event.ctrlKey) &&
  !event.altKey &&
  !event.shiftKey;

const overlayOpen = (): boolean =>
  [...document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR)].some(
    (element) => element.getClientRects().length > 0
  );

export const useEscapeStop = (active: boolean, onStop: () => void): void => {
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

    globalThis.addEventListener("keydown", onKey, { capture: true });
    globalThis.addEventListener(PREVIEW_STOP_EVENT, onFrameStop);

    return () => {
      globalThis.removeEventListener("keydown", onKey, { capture: true });
      globalThis.removeEventListener(PREVIEW_STOP_EVENT, onFrameStop);
    };
  }, [active]);
};
