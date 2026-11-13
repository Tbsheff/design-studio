import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { postToFrame, useBridge } from "./deps.js";
import { toReaderTargets } from "./reader-model.js";
import type { ReaderLine } from "./reader-model.js";
import { framesOf, frontOf, rectsOf } from "./use-tab-order.js";
import type { BadgeRect, FrontSource } from "./use-tab-order.js";

interface ReaderRects {
  readonly rectOf: (selector: string) => BadgeRect | null;
  readonly handleSelect: (selector: string) => void;
}

const TRACK = "track-links";

const useReaderRects = (
  source: FrontSource,
  lines: readonly ReaderLine[]
): ReaderRects => {
  const targets = useMemo(() => toReaderTargets(lines), [lines]);

  const [rects, setRects] = useState<ReadonlyMap<string, BadgeRect>>(
    () => new Map()
  );

  const latest = useRef({ queries: targets.queries, source });

  useEffect(() => {
    latest.current = { queries: targets.queries, source };
  }, [source, targets.queries]);

  useEffect(() => {
    const frame = frontOf(source);

    if (frame === null) {
      return;
    }

    postToFrame(frame, { links: [...targets.queries], type: TRACK });

    return (): void => {
      postToFrame(frame, { links: [], type: TRACK });
    };
  }, [source, targets.queries]);

  useBridge(
    () => framesOf(latest.current.source),
    (frame, message) => {
      if (message.type === "ready") {
        postToFrame(frame, { links: [...latest.current.queries], type: TRACK });

        return;
      }

      if (message.type === "link-rects") {
        setRects(rectsOf(message));
      }
    }
  );

  const rectOf = useCallback(
    (selector: string): BadgeRect | null =>
      rects.get(targets.idBySelector.get(selector) ?? "") ?? null,
    [rects, targets.idBySelector]
  );

  const handleSelect = useCallback((selector: string): void => {
    const frame = frontOf(latest.current.source);

    if (frame !== null) {
      postToFrame(frame, { selector, type: "select-selector" });
    }
  }, []);

  return { handleSelect, rectOf };
};

export { useReaderRects };

export type { ReaderRects };
