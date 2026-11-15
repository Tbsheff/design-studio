import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

interface PreviewFrame {
  readonly schedule: (value: string) => void;
  readonly stop: () => void;
}

const useDragEscape = (
  isDragging: RefObject<boolean>,
  cancel: () => void
): void => {
  const latest = useRef(cancel);

  useEffect(() => {
    latest.current = cancel;
  }, [cancel]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && isDragging.current) {
        latest.current();
      }
    };

    globalThis.addEventListener("keydown", onKey, true);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey, true);
    };
  }, [isDragging]);
};

const usePreviewFrame = (
  onPreview: ((value: string) => void) | null
): PreviewFrame => {
  const frame = useRef<number | null>(null);
  const latest = useRef<string | null>(null);

  const stop = useCallback((): void => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
    }

    frame.current = null;
  }, []);

  const schedule = useCallback(
    (value: string): void => {
      latest.current = value;

      if (!onPreview || frame.current !== null) {
        return;
      }

      frame.current = requestAnimationFrame(() => {
        frame.current = null;

        if (latest.current !== null) {
          onPreview(latest.current);
        }
      });
    },
    [onPreview]
  );

  useEffect(() => stop, [stop]);

  return { schedule, stop };
};

export { useDragEscape, usePreviewFrame };
