import { useEffect } from "react";
import type { RefObject } from "react";

const REFOCUS_WINDOW_MS = 800;

const isFrameFocused = (): boolean =>
  document.activeElement instanceof HTMLIFrameElement;

const useAutoFocus = (
  isEnabled: boolean,
  area: RefObject<HTMLTextAreaElement | null>
): void => {
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    area.current?.focus({ preventScroll: true });

    const until = performance.now() + REFOCUS_WINDOW_MS;

    const onBlur = (): void => {
      if (performance.now() > until) {
        return;
      }

      globalThis.requestAnimationFrame(() => {
        if (isFrameFocused()) {
          area.current?.focus({ preventScroll: true });
        }
      });
    };

    globalThis.addEventListener("blur", onBlur);

    return (): void => globalThis.removeEventListener("blur", onBlur);
  }, [isEnabled, area]);
};

export { useAutoFocus };
