import { useCallback, useState } from "react";
import type { RefObject } from "react";

import type { PreviewPort, SourceLoc } from "./deps.js";
import { toIsRemove, toSpot } from "./text-range-model.js";
import type {
  TextRangeCommand,
  TextRangeReading,
  TextRangeSpot,
} from "./text-range-model.js";
import { useTextRangeActions } from "./use-text-range-actions.js";
import type { TextRangeActions } from "./use-text-range-actions.js";
import { useTextRangeApply } from "./use-text-range-apply.js";
import { useTextRangeFeed } from "./use-text-range-feed.js";

interface TextRangeSetup {
  readonly directionId: string | null;
  readonly port: RefObject<PreviewPort | null>;
  readonly projectId: string;
  readonly selector: string | null;
  readonly source: SourceLoc | null;
}

interface TextRangeView extends TextRangeActions {
  readonly failure: string | null;
  readonly isDirty: boolean;
  readonly isLinkOpen: boolean;
  readonly isPending: boolean;
  readonly spot: TextRangeSpot | null;
  readonly tag: string;
}

const useTextRange = (setup: TextRangeSetup): TextRangeView => {
  const [held, setHeld] = useState<TextRangeReading | null>(null);
  const [isLinkOpen, setIsLinkOpen] = useState(false);

  const handleResult = useCallback((isOk: boolean): void => {
    if (isOk) {
      setHeld(null);
    }
  }, []);

  const applied = useTextRangeApply({ ...setup, onResult: handleResult });
  const { apply, clear } = applied;

  const handleCommand = useCallback(
    (
      command: TextRangeCommand,
      reading: TextRangeReading,
      className: string
    ): void => {
      const isRemove = toIsRemove(command, reading.tag, className);

      setHeld(reading);

      if (command === "link" && !isRemove) {
        setIsLinkOpen(true);

        return;
      }

      apply({ isRemove, reading, style: command, value: null });
    },
    [apply]
  );

  const handleFresh = useCallback((): void => {
    setHeld(null);
    setIsLinkOpen(false);
    clear();
  }, [clear]);

  const feed = useTextRangeFeed({
    onCommand: handleCommand,
    onFresh: handleFresh,
    port: setup.port,
    selector: setup.selector,
  });

  const shown = held ?? feed.reading;

  const actions = useTextRangeActions({
    apply,
    clear,
    setHeld,
    setIsLinkOpen,
    shown,
  });

  let spot: TextRangeSpot | null = null;

  if (shown && feed.frame) {
    spot = toSpot(shown, feed.frame);
  }

  return {
    ...actions,
    failure: applied.failure,
    isDirty: shown?.isDirty ?? false,
    isLinkOpen,
    isPending: applied.isPending,
    spot,
    tag: shown?.tag ?? "",
  };
};

export { useTextRange };

export type { TextRangeSetup, TextRangeView };
