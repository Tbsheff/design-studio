import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FIND_TEXT_KEY } from "./copy.js";
import { FIND_TEXT_EVENT, IS_MAC, matchesKey } from "./deps.js";
import type { CanvasFrame, TextHit } from "./deps.js";
import { locOf } from "./text-search-model.js";

interface SelectSourceMessage {
  readonly sourceLoc: string;
  readonly tag: string;
  readonly text: string;
  readonly type: "select-source";
}

interface FindHostOptions {
  readonly enabled: boolean;
  readonly frames: {
    readonly activate: (frame: CanvasFrame) => void;
    readonly active: CanvasFrame;
    readonly layout: { readonly frames: readonly CanvasFrame[] };
  };
  readonly post: (message: SelectSourceMessage) => void;
}

interface FindHost {
  readonly close: () => void;
  readonly frameName: (id: string | null) => string | null;
  readonly isOpen: boolean;
  readonly reveal: (hit: TextHit) => void;
}

const RESELECT_SOON_MS = 250;

const RESELECT_LATER_MS = 700;

const RESELECT_LAST_MS = 1500;

const RESELECT_MS = [0, RESELECT_SOON_MS, RESELECT_LATER_MS, RESELECT_LAST_MS];

const useFindTrigger = (enabled: boolean, open: () => void): void => {
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKey = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        !matchesKey(FIND_TEXT_KEY, event, IS_MAC)
      ) {
        return;
      }

      event.preventDefault();
      openRef.current();
    };

    const handleOpen = (): void => {
      openRef.current();
    };

    globalThis.addEventListener("keydown", handleKey);
    globalThis.addEventListener(FIND_TEXT_EVENT, handleOpen);

    return (): void => {
      globalThis.removeEventListener("keydown", handleKey);
      globalThis.removeEventListener(FIND_TEXT_EVENT, handleOpen);
    };
  }, [enabled]);
};

const nameOf = (
  frames: readonly CanvasFrame[],
  id: string | null
): string | null => {
  if (id === null) {
    return null;
  }

  const frame = frames.find((entry) => entry.id === id);

  return frame?.label ?? frame?.path ?? null;
};

const useFindHost = (options: FindHostOptions): FindHost => {
  const [isPicked, setIsPicked] = useState(false);
  const { enabled, frames, post } = options;
  const { activate, active, layout } = frames;

  const open = useCallback((): void => {
    setIsPicked(true);
  }, []);

  const close = useCallback((): void => {
    setIsPicked(false);
  }, []);

  useFindTrigger(enabled, open);

  const reveal = useCallback(
    (hit: TextHit): void => {
      const frame = layout.frames.find((entry) => entry.id === hit.frame);

      if (frame && frame.id !== active.id) {
        activate(frame);
      }

      const message: SelectSourceMessage = {
        sourceLoc: locOf(hit),
        tag: hit.layer.tag,
        text: "",
        type: "select-source",
      };

      for (const wait of RESELECT_MS) {
        globalThis.setTimeout(() => post(message), wait);
      }
    },
    [activate, active.id, layout.frames, post]
  );

  const frameName = useCallback(
    (id: string | null): string | null => nameOf(layout.frames, id),
    [layout.frames]
  );

  const isOpen = isPicked && enabled;

  return useMemo(
    () => ({ close, frameName, isOpen, reveal }),
    [close, frameName, isOpen, reveal]
  );
};

export { useFindHost };

export type { FindHost, FindHostOptions, SelectSourceMessage };
