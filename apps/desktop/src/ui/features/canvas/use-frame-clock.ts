import type { FrameStateDef } from "@design-studio/contracts/frame-state";
import { useCallback } from "react";

import {
  CLOCK_STATE_NAME,
  hasClock,
  isClockFrozen,
  toClockValue,
} from "./frame-clock-model.js";
import { setFrameState } from "./frame-states-model.js";
import { isCustomState } from "./open-steps-model.js";

interface FrameClock {
  readonly changeClock: (value: string) => void;
  readonly clearClock: () => void;
  readonly isFrozen: boolean;
  readonly toggleFrozen: () => void;
  readonly value: string;
}

const useFrameClock = ({
  def,
  frameId,
  projectId,
  run,
}: {
  def: FrameStateDef | null;
  frameId: string;
  projectId: string;
  run: (task: Promise<unknown>) => Promise<void>;
}): FrameClock => {
  const isFrozen = isClockFrozen(def);
  const isSignedIn = def?.signedIn ?? false;
  const value = toClockValue(def);

  const send = useCallback(
    (change: { clock: string | null; isClockFrozen: boolean }): void => {
      if (isCustomState(def)) {
        void run(setFrameState(projectId, frameId, def.id, change));

        return;
      }

      void run(
        setFrameState(projectId, frameId, "mock", {
          ...change,
          name: CLOCK_STATE_NAME,
          signedIn: isSignedIn,
        })
      );
    },
    [def, isSignedIn, run, projectId, frameId]
  );

  const changeClock = useCallback(
    (next: string): void => {
      if (next !== "") {
        send({ clock: next, isClockFrozen: isFrozen });
      }
    },
    [send, isFrozen]
  );

  const clearClock = useCallback((): void => {
    if (hasClock(def)) {
      send({ clock: null, isClockFrozen: true });
    }
  }, [def, send]);

  const toggleFrozen = useCallback((): void => {
    if (hasClock(def)) {
      send({ clock: value, isClockFrozen: !isFrozen });
    }
  }, [def, send, value, isFrozen]);

  return { changeClock, clearClock, isFrozen, toggleFrozen, value };
};

export { useFrameClock };
