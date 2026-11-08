import type {
  BridgeToParent,
  NudgeItem,
  SelectionContext,
} from "@design-studio/contracts";
import type { MutableRefObject, RefObject } from "react";

import { api, errorText } from "../../api.js";
import type { ParentMessageBody } from "../../platform/bridge.js";
import { applyCommit, createCurrentEditRequest } from "./edit-request-model.js";
import { toMultiBlockReason } from "./mixed-values.js";
import {
  FLOW_HINT,
  SAVE_MS,
  isMovable,
  toBurstKey,
  toFlowHint,
  toMoverHint,
  toNudgeStyle,
  toSaved,
} from "./nudge-model.js";
import type { Burst, Mover, Saved } from "./nudge-model.js";
import { startOptimistic } from "./optimistic-edit.js";
import { stopTimer } from "./timer-model.js";
import type { TimerRef } from "./timer-model.js";

interface NudgeOptions {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext[];
  readonly isEnabled: boolean;
  readonly post: (body: ParentMessageBody) => void;
  readonly listen: (handler: (message: BridgeToParent) => void) => () => void;
  readonly setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
  readonly refreshRects: () => void;
  readonly onError: (message: string) => void;
}

interface NudgeCore {
  readonly live: RefObject<NudgeOptions>;
  readonly burst: MutableRefObject<Burst | null>;
  readonly timer: TimerRef;
}

const shown = new Set<string>();

const runHintOnce = (core: NudgeCore, text: string): void => {
  if (shown.has(text)) {
    return;
  }

  shown.add(text);
  core.live.current.onError(text);
};

const runRestore = (core: NudgeCore, list: Saved[], message: string): void => {
  core.live.current.post({ type: "preview-reset" });

  for (const one of list) {
    core.live.current.setSelection((prev) =>
      applyCommit(prev, { selector: one.selector, style: one.back })
    );
  }

  core.live.current.onError(message);
};

const runNudgeSave = async (core: NudgeCore, batch: Burst): Promise<void> => {
  const cur = core.live.current;
  const list = toSaved(batch, createCurrentEditRequest);

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
    if (list.length === 1) {
      const result = await api.directEdit(
        cur.projectId,
        cur.directionId,
        (list[0] as Saved).edit
      );

      optimistic[0]?.saved(result.tailwind);
    } else {
      const result = await api.directEditBatch(cur.projectId, cur.directionId, {
        edits: list.map((one) => one.edit),
      });

      for (const [index, one] of optimistic.entries()) {
        one.saved(result.applied[index]?.tailwind);
      }
    }

    core.live.current.refreshRects();
  } catch (error) {
    for (const one of optimistic) {
      one.failed(errorText(error));
    }

    runRestore(core, list, errorText(error));
  }
};

const runNudgeFlush = (core: NudgeCore): void => {
  stopTimer(core.timer);

  const batch = core.burst.current;
  core.burst.current = null;

  if (batch && (batch.dx !== 0 || batch.dy !== 0)) {
    runNudgeSave(core, batch);
  }
};

const toMovers = (core: NudgeCore, wanted: NudgeItem[]): Mover[] | null => {
  const cur = core.live.current;

  if (!cur.isEnabled || !cur.directionId) {
    return null;
  }

  const picked = wanted.flatMap((item) => {
    const target = cur.selection.find(
      (entry) => entry.selector === item.selector
    );

    if (target) {
      return [{ base: item.base, target }];
    }

    return [];
  });

  if (picked.length === 0) {
    return null;
  }

  const reason = toMoverHint(picked, toMultiBlockReason);

  if (reason) {
    runHintOnce(core, reason);

    return null;
  }

  return picked;
};

const toBurst = (
  core: NudgeCore,
  wanted: NudgeItem[],
  key: string
): Burst | null => {
  const all = toMovers(core, wanted);

  if (!all) {
    return null;
  }

  const items = all.filter((item) => item.base.mode !== "none");

  if (items.length < all.length) {
    runHintOnce(core, toFlowHint(items.length));
  }

  if (items.length === 0) {
    return null;
  }

  return { dx: 0, dy: 0, items, key };
};

const runNudgePress = (
  core: NudgeCore,
  wanted: NudgeItem[],
  delta: { readonly dx: number; readonly dy: number }
): void => {
  const key = toBurstKey(wanted.map((item) => item.selector));

  if (core.burst.current && core.burst.current.key !== key) {
    runNudgeFlush(core);
  }

  const current = core.burst.current ?? toBurst(core, wanted, key);

  if (!current) {
    return;
  }

  if (!current.items.some((item) => isMovable(item.base, delta.dx, delta.dy))) {
    runHintOnce(core, FLOW_HINT);

    return;
  }

  const batch = {
    ...current,
    dx: current.dx + delta.dx,
    dy: current.dy + delta.dy,
  };

  core.burst.current = batch;

  for (const item of batch.items) {
    core.live.current.post({
      selector: item.target.selector,
      style: toNudgeStyle({ base: item.base, dx: batch.dx, dy: batch.dy }),
      type: "preview-style",
    });
  }

  core.live.current.refreshRects();
  stopTimer(core.timer);
  core.timer.current = globalThis.setTimeout(
    () => runNudgeFlush(core),
    SAVE_MS
  );
};

export { runNudgeFlush, runNudgePress };

export type { NudgeCore, NudgeOptions };
