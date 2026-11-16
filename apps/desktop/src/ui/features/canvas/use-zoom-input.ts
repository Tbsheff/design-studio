import { zoomKeyOf } from "@design-studio/contracts";
import type { ZoomKey } from "@design-studio/contracts";
import { useCallback, useEffect, useRef } from "react";

import { useDesktopCommand } from "../../platform/desktop.js";
import { blocksZoomKey } from "./pan-zoom-model.js";

const ZOOM_ECHO_MS = 150;

type ZoomSource = "key" | "frame" | "menu";

interface LastZoom {
  key: ZoomKey;
  source: ZoomSource;
  at: number;
}

const isEcho = (
  last: LastZoom | null,
  key: ZoomKey,
  source: ZoomSource,
  now: number
): boolean =>
  Boolean(
    last &&
    last.key === key &&
    last.source !== source &&
    now - last.at < ZOOM_ECHO_MS
  );

const useZoomInput = (
  apply: (key: ZoomKey) => void
): ((key: ZoomKey, source: ZoomSource) => void) => {
  const lastZoom = useRef<LastZoom | null>(null);

  const zoomBy = useCallback(
    (key: ZoomKey, source: ZoomSource): void => {
      const now = performance.now();

      if (isEcho(lastZoom.current, key, source, now)) {
        return;
      }

      lastZoom.current = { at: now, key, source };
      apply(key);
    },
    [apply]
  );

  useDesktopCommand((command) => {
    if (command.type !== "zoom") {
      return false;
    }

    zoomBy(command.key, "menu");

    return true;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const key = zoomKeyOf(event);

      if (!key || blocksZoomKey(event)) {
        return;
      }

      event.preventDefault();
      zoomBy(key, "key");
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, [zoomBy]);

  return zoomBy;
};

export { useZoomInput };

export type { ZoomSource };
