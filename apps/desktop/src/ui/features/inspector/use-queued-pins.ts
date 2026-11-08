import type { SelectionContext } from "@design-studio/contracts";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { PinAxis, PinMode } from "./constraints.js";
import type { DirectEdit } from "./deps.js";
import {
  PIN_RESELECT_MS,
  hasPinGeometry,
  toActiveQueue,
  toQueuedPatch,
  toQueuedPins,
} from "./position-model.js";
import type { QueuedPins } from "./position-model.js";

interface QueuedPinsApi {
  readonly queue: (axis: PinAxis, mode: PinMode, from: PinMode) => void;
  readonly isReady: boolean;
}

const useQueuedPins = (
  edit: DirectEdit,
  selection: SelectionContext
): QueuedPinsApi => {
  const [queued, setQueued] = useState<QueuedPins | null>(null);
  const lastApplied = useRef<QueuedPins | null>(null);
  const isReady = hasPinGeometry(selection);
  const { selector } = selection;
  const active = toActiveQueue(queued, selector);
  useEffect(() => {
    if (queued && !active) {
      startTransition(() => setQueued(null));

      return;
    }

    if (!active || !isReady || lastApplied.current === active) {
      return;
    }

    lastApplied.current = active;
    startTransition(() => {
      setQueued(null);
      edit.previewForced(toQueuedPatch(active, edit, selection));
      edit.commit();
    });
  }, [queued, active, isReady, selection, edit]);
  const isWaiting = active !== null && !isReady;
  const { reselect } = edit;
  useEffect(() => {
    if (!isWaiting) {
      return;
    }

    const timers = PIN_RESELECT_MS.map((ms) =>
      globalThis.setTimeout(reselect, ms)
    );

    return (): void => {
      for (const timer of timers) {
        globalThis.clearTimeout(timer);
      }
    };
  }, [isWaiting, reselect]);

  const queue = useCallback(
    (axis: PinAxis, mode: PinMode, from: PinMode): void =>
      setQueued((prev) => toQueuedPins(prev, selector, axis, { from, mode })),
    [selector]
  );

  return { isReady, queue };
};

export { useQueuedPins };

export type { QueuedPinsApi };
