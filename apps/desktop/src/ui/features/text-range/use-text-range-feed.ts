import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { useLatest } from "../../platform/use-latest.js";
import type { PreviewPort } from "./deps.js";
import { toKeyReading, toReading } from "./text-range-model.js";
import type {
  TextRangeBox,
  TextRangeCommand,
  TextRangeFrame,
  TextRangeReading,
} from "./text-range-model.js";

interface TextRangeFeedSetup {
  readonly onCommand: (
    command: TextRangeCommand,
    reading: TextRangeReading,
    className: string
  ) => void;
  readonly onFresh: () => void;
  readonly port: RefObject<PreviewPort | null>;
  readonly selector: string | null;
}

interface TextRangeFeed {
  readonly frame: TextRangeFrame | null;
  readonly reading: TextRangeReading | null;
}

const NO_BOX: TextRangeBox = { height: 0, width: 0, x: 0, y: 0 };

const toFrameOf = (): TextRangeFrame | null => {
  const active = document.activeElement;

  if (!(active instanceof HTMLIFrameElement)) {
    return null;
  }

  const box = active.getBoundingClientRect();
  let ratio = 1;

  if (active.offsetWidth > 0) {
    ratio = box.width / active.offsetWidth;
  }

  return {
    left: box.left,
    scale: ratio,
    top: box.top,
    viewHeight: globalThis.innerHeight,
    viewWidth: globalThis.innerWidth,
  };
};

const useTextRangeFeed = (setup: TextRangeFeedSetup): TextRangeFeed => {
  const [reading, setReading] = useState<TextRangeReading | null>(null);
  const [frame, setFrame] = useState<TextRangeFrame | null>(null);
  const latest = useLatest(setup);
  const boxRef = useRef<TextRangeBox>(NO_BOX);
  const { port, selector } = setup;

  useEffect(() => {
    const listen = port.current?.listen;

    if (!listen || selector === null) {
      return;
    }

    return listen((message) => {
      if (message.type === "ready") {
        setReading(null);

        return;
      }

      if (message.type === "text-range") {
        const next = toReading(message);
        setReading(next);

        if (next) {
          boxRef.current = next.rect;
          setFrame((current) => toFrameOf() ?? current);
          latest.current.onFresh();
        }

        return;
      }

      if (message.type === "text-range-key") {
        latest.current.onCommand(
          message.command,
          toKeyReading(message, boxRef.current),
          message.className
        );
      }
    });
  }, [latest, port, selector]);

  return { frame, reading };
};

export { useTextRangeFeed };

export type { TextRangeFeed, TextRangeFeedSetup };
