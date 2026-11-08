import { useEffect, useLayoutEffect, useRef } from "react";

const PREVIEW_ESCAPE_EVENT = "studio:preview-escape";
const PREVIEW_STOP_EVENT = "studio:preview-stop";

const OVERLAY_SELECTOR = 'dialog[open], [role="dialog"][aria-modal="true"]';

const hasStopModifier = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;

const isStopKey = (event: KeyboardEvent): boolean =>
  event.key === "." && hasStopModifier(event);

const overlayOpen = (): boolean =>
  [...document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR)].some(
    (element) => element.getClientRects().length > 0
  );

const useEscapeStop = (active: boolean, onStop: () => void): void => {
  const stop = useRef(onStop);
  useLayoutEffect(() => {
    stop.current = onStop;
  }, [onStop]);
  useEffect(() => {
    if (!active) {
      return;
    }

    const onKey = (event: KeyboardEvent): void => {
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

    const onFrameStop = (): void => {
      if (!overlayOpen()) {
        stop.current();
      }
    };

    globalThis.addEventListener("keydown", onKey, { capture: true });
    globalThis.addEventListener(PREVIEW_STOP_EVENT, onFrameStop);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey, { capture: true });
      globalThis.removeEventListener(PREVIEW_STOP_EVENT, onFrameStop);
    };
  }, [active]);
};

export { PREVIEW_ESCAPE_EVENT, PREVIEW_STOP_EVENT, useEscapeStop };
