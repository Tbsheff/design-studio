import type {
  BridgeToParent,
  SelectionContext,
} from "@design-studio/contracts";
import { stateOfHost } from "@design-studio/contracts/frame-state";
import type {
  FrameStatesView,
  OpenStep,
} from "@design-studio/contracts/frame-state";
import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

import { postToFrame, useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { useLive } from "../../platform/live-store.js";
import { useCurrentFrameStates } from "./frame-states-model.js";
import { stageFrames } from "./lofi-frames-model.js";
import {
  openStepsPush,
  selectedTrigger,
  setMissed,
  toStepsOf,
} from "./open-steps-model.js";

const toStateId = (url: string): string | null => {
  try {
    return stateOfHost(new URL(url).hostname)?.state ?? null;
  } catch {
    return null;
  }
};

const toFrameSteps = (
  view: FrameStatesView | null,
  frame: BridgeFrame
): OpenStep[] => {
  const stateId = toStateId(frame.url);

  if (stateId === null) {
    return [];
  }

  return toStepsOf(view?.states.find((state) => state.id === stateId) ?? null);
};

const useOpenSteps = (
  stageRef: RefObject<HTMLElement | null>,
  kind: BridgeFrame["kind"],
  currentId: string | null,
  selection: readonly SelectionContext[]
): void => {
  const states = useCurrentFrameStates();
  const view = states?.view ?? null;
  const sent = useRef(new WeakMap<HTMLIFrameElement, string>());

  const frames = useCallback(
    () => stageFrames(stageRef.current, kind, currentId),
    [stageRef, kind, currentId]
  );

  const sync = useCallback(
    (frame: BridgeFrame, isForced: boolean): void => {
      const { element } = frame;

      if (!element) {
        return;
      }

      const steps = toFrameSteps(view, frame);
      const key = JSON.stringify(steps);
      const prior = sent.current.get(element) ?? "[]";

      if (key === prior && !(isForced && steps.length > 0)) {
        return;
      }

      sent.current.set(element, key);
      postToFrame(frame, { steps, type: "open-steps" });

      if (steps.length === 0) {
        setMissed(toStateId(frame.url) ?? "", []);
      }
    },
    [view]
  );

  useBridge(frames, (frame: BridgeFrame, message: BridgeToParent) => {
    if (message.type === "ready") {
      sync(frame, true);
    }

    if (message.type === "open-steps-result") {
      const stateId = toStateId(frame.url);

      if (stateId !== null) {
        setMissed(stateId, message.missed);
      }
    }
  });

  useEffect(() => {
    for (const frame of frames()) {
      sync(frame, false);
    }
  });

  const push = useLive(openStepsPush);

  useEffect(() => {
    if (push === 0) {
      return;
    }

    for (const frame of frames()) {
      sync(frame, true);
    }
  }, [push, frames, sync]);

  const selector = selection[0]?.selector ?? null;

  useEffect(() => {
    selectedTrigger.set(selector);
  }, [selector]);
};

export { useOpenSteps };
