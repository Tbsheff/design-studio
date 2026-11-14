import type { BridgeToParent } from "@design-studio/contracts";
import { useEffect, useMemo } from "react";
import type { MutableRefObject, RefObject } from "react";

import { toResizeChord, toResizeStep } from "../../../shared/resize-step.js";
import type { ResizeStep } from "../../../shared/resize-step.js";
import { api, errorText } from "../../api.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import type { StyleValues } from "./css-value-model.js";
import { applyCommit } from "./edit-request-model.js";
import { shouldTakeArrowKeys } from "./nudge-focus-model.js";
import { FLUSH_ON, SAVE_MS, toBurstKey } from "./nudge-model.js";
import { startOptimistic } from "./optimistic-edit-model.js";
import {
  isSizeChanged,
  toBackStyle,
  toNextItem,
  toSizeBlock,
  toSizeItem,
  toSizeStyle,
} from "./size-keys-model.js";
import type { SizeBurst } from "./size-keys-model.js";
import { stopTimer } from "./timer-model.js";
import type { TimerRef } from "./timer-model.js";
import { useCell } from "./use-cell.js";
import { createCurrentEditRequest } from "./use-current-edit-request.js";
import type { NudgeOptions } from "./use-element-nudge-core.js";
import { useLatestRef } from "./use-latest-ref.js";

interface SizeCore {
  readonly burst: MutableRefObject<SizeBurst | null>;
  readonly live: RefObject<NudgeOptions>;
  readonly timer: TimerRef;
}

interface SizeSave {
  readonly back: Record<string, string>;
  readonly edit: NonNullable<ReturnType<typeof createCurrentEditRequest>>;
  readonly selector: string;
  readonly style: Partial<StyleValues>;
}

const toSizeSaves = (burst: SizeBurst): SizeSave[] =>
  burst.items.flatMap((item) => {
    const style = toSizeStyle(item);
    const edit = createCurrentEditRequest(item.target, style);

    if (!edit || !isSizeChanged(item)) {
      return [];
    }

    const back = toBackStyle(item, style);
    const { selector } = item.target;

    return [{ back, edit, selector, style }];
  });

const runSizeRestore = (
  core: SizeCore,
  list: readonly SizeSave[],
  message: string
): void => {
  const cur = core.live.current;
  cur.post({ type: "preview-reset" });

  for (const one of list) {
    cur.setSelection((prev) =>
      applyCommit(prev, { selector: one.selector, style: one.back })
    );
  }

  cur.onError(message);
};

const runSizeSave = async (core: SizeCore, burst: SizeBurst): Promise<void> => {
  const cur = core.live.current;
  const list = toSizeSaves(burst);

  if (list.length === 0 || !cur.directionId) {
    return;
  }

  for (const one of list) {
    cur.setSelection((prev) =>
      applyCommit(prev, { selector: one.selector, style: one.style })
    );
  }

  const port = { post: cur.post, refreshRects: cur.refreshRects };

  const optimistic = list.map((one) =>
    startOptimistic(port, one.edit, (message) =>
      core.live.current.onError(message)
    )
  );

  try {
    const result = await api.directEditBatch(cur.projectId, cur.directionId, {
      edits: list.map((one) => one.edit),
    });

    for (const [index, one] of optimistic.entries()) {
      one.saved(result.applied[index]?.tailwind ?? null);
    }

    core.live.current.refreshRects();
  } catch (error) {
    for (const one of optimistic) {
      one.failed(errorText(error));
    }

    runSizeRestore(core, list, errorText(error));
  }
};

const runSizeFlush = (core: SizeCore): void => {
  stopTimer(core.timer);

  const burst = core.burst.current;
  core.burst.current = null;

  if (burst) {
    void runSizeSave(core, burst);
  }
};

const toStartBurst = (core: SizeCore): SizeBurst | null => {
  const cur = core.live.current;
  const key = toBurstKey(cur.selection.map((entry) => entry.selector));

  if (core.burst.current && core.burst.current.key !== key) {
    runSizeFlush(core);
  }

  if (core.burst.current) {
    return core.burst.current;
  }

  const reason = toSizeBlock(cur.selection);

  if (reason) {
    cur.onError(reason);

    return null;
  }

  return { items: cur.selection.map(toSizeItem), key };
};

const runSizeStep = (core: SizeCore, step: ResizeStep): void => {
  const cur = core.live.current;

  if (!cur.isEnabled || !cur.directionId || cur.selection.length === 0) {
    return;
  }

  const start = toStartBurst(core);

  if (!start) {
    return;
  }

  const burst = {
    ...start,
    items: start.items.map((item) => toNextItem(item, step)),
  };

  core.burst.current = burst;

  for (const item of burst.items) {
    cur.post({
      selector: item.target.selector,
      style: toSizeStyle(item),
      type: "preview-style",
    });
  }

  cur.refreshRects();
  stopTimer(core.timer);
  core.timer.current = globalThis.setTimeout(() => runSizeFlush(core), SAVE_MS);
};

const isSizeKeyTarget = (core: SizeCore, event: KeyboardEvent): boolean => {
  const cur = core.live.current;

  return (
    cur.isEnabled && cur.selection.length > 0 && !isTypingTarget(event.target)
  );
};

const runSizeKey = (core: SizeCore, event: KeyboardEvent): void => {
  const step = toResizeStep(toResizeChord(event));

  if (!step || !isSizeKeyTarget(core, event) || !shouldTakeArrowKeys()) {
    return;
  }

  event.preventDefault();
  runSizeStep(core, step);
};

const runSizeMessage = (core: SizeCore, message: BridgeToParent): void => {
  if (message.type === "arrange-key") {
    const step = toResizeStep(message.key);

    if (step) {
      runSizeStep(core, step);
    }

    return;
  }

  if (FLUSH_ON.has(message.type)) {
    runSizeFlush(core);
  }
};

const useSizeKeys = (options: NudgeOptions): void => {
  const live = useLatestRef(options);
  const burst = useCell<SizeBurst | null>(null);
  const timer: TimerRef = useCell(null);

  const core: SizeCore = useMemo(
    () => ({ burst, live, timer }),
    [burst, live, timer]
  );

  const { listen } = options;

  useEffect(() => {
    const stop = listen((message) => runSizeMessage(core, message));
    const onKey = (event: KeyboardEvent): void => runSizeKey(core, event);
    globalThis.addEventListener("keydown", onKey, true);

    return (): void => {
      stop();
      globalThis.removeEventListener("keydown", onKey, true);
      runSizeFlush(core);
    };
  }, [core, listen]);

  const key = toBurstKey(options.selection.map((entry) => entry.selector));

  useEffect(() => {
    if (burst.current && key !== burst.current.key) {
      runSizeFlush(core);
    }
  }, [key, burst, core]);
};

export { useSizeKeys };
