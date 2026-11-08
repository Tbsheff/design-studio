import type { BridgeToParent } from "@design-studio/contracts";
import { useEffect, useMemo } from "react";

import { nudgeStepOf } from "../../../shared/nudge.js";
import {
  shouldBlurToCanvas,
  shouldTakeArrowKeys,
  toCanvasKeys,
} from "./nudge-focus-model.js";
import {
  FLUSH_ON,
  shouldPickNew,
  toBurstKey,
  toNudgeStyle,
} from "./nudge-model.js";
import type { Burst } from "./nudge-model.js";
import type { TimerRef } from "./timer-model.js";
import { useCell } from "./use-cell.js";
import { runNudgeFlush, runNudgePress } from "./use-element-nudge-core.js";
import type { NudgeCore, NudgeOptions } from "./use-element-nudge-core.js";
import { useLatestRef } from "./use-latest-ref.js";

const runNudgeKey = (core: NudgeCore, event: KeyboardEvent): void => {
  const cur = core.live.current;

  if (cur.isEnabled && cur.selection.length > 0 && shouldBlurToCanvas(event)) {
    return;
  }

  const step = nudgeStepOf(event);

  if (!step) {
    if (core.burst.current && event.key !== "Shift") {
      runNudgeFlush(core);
    }

    return;
  }

  if (!cur.isEnabled || cur.selection.length === 0 || !shouldTakeArrowKeys()) {
    return;
  }

  event.preventDefault();
  cur.post({ dx: step.dx, dy: step.dy, type: "nudge" });
};

const runNudgeMessage = (core: NudgeCore, message: BridgeToParent): void => {
  if (message.type === "nudge-key") {
    runNudgePress(
      core,
      [
        { base: message.base, selector: message.selector },
        ...(message.others ?? []),
      ],
      { dx: message.dx, dy: message.dy }
    );

    return;
  }

  if (FLUSH_ON.has(message.type)) {
    runNudgeFlush(core);
  }
};

const isEditingState = (
  message: BridgeToParent,
  previous: boolean
): boolean => {
  if (message.type === "text-edit") {
    return message.state === "start";
  }

  if (message.type === "text-commit") {
    return false;
  }

  return previous;
};

const useNudgeListeners = (
  core: NudgeCore,
  listen: NudgeOptions["listen"]
): void => {
  useEffect(() => {
    let isEditing = false;

    const stop = listen((message) => {
      runNudgeMessage(core, message);
      isEditing = isEditingState(message, isEditing);

      if (shouldPickNew(message, core.live.current.selection)) {
        globalThis.setTimeout(() => isEditing || toCanvasKeys(), 0);
      }
    });

    const onKey = (event: KeyboardEvent): void => runNudgeKey(core, event);
    globalThis.addEventListener("keydown", onKey, true);

    return (): void => {
      stop();
      globalThis.removeEventListener("keydown", onKey, true);
      runNudgeFlush(core);
    };
  }, [core, listen]);
};

const useElementNudge = (options: NudgeOptions): void => {
  const live = useLatestRef(options);
  const burst = useCell<Burst | null>(null);
  const timer: TimerRef = useCell(null);

  const core: NudgeCore = useMemo(
    () => ({ burst, live, timer }),
    [burst, live, timer]
  );

  useNudgeListeners(core, options.listen);

  const key = toBurstKey(options.selection.map((entry) => entry.selector));

  useEffect(() => {
    if (burst.current && key !== burst.current.key) {
      runNudgeFlush(core);
    }
  }, [key, burst, core]);
};

export { toNudgeStyle, useElementNudge };
