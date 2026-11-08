import type { SelectionContext } from "@design-studio/contracts";
import { startTransition } from "react";
import type {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from "react";

import { api } from "../../api.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { changedProps } from "./css-values.js";
import type { StyleValues } from "./css-values.js";
import type {
  DirectEditCommit,
  DirectEditControl,
  SaveStatus,
} from "./direct-edit-model.js";
import { toOwnEdits, toWithoutShifts } from "./mixed-values.js";
import type { MergedValues, OwnEdit, Shifts } from "./mixed-values.js";
import { startOptimistic } from "./optimistic-edit.js";
import { stopTimer } from "./timer-model.js";
import type { TimerRef } from "./timer-model.js";
import { isStaleSelection, toFailureText } from "./use-direct-edit-core.js";

interface MultiOptions {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selections: SelectionContext[];
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly control: MutableRefObject<DirectEditControl | null>;
  readonly onCommitted: (commit: DirectEditCommit) => void;
  readonly onStale: (message: string) => void;
  readonly rewrite:
    | ((style: Partial<StyleValues>) => Partial<StyleValues>)
    | null;
}

interface MultiCore {
  readonly opts: RefObject<MultiOptions>;
  readonly basesRef: RefObject<StyleValues[]>;
  readonly mergedRef: RefObject<MergedValues>;
  readonly blockedRef: RefObject<string | null>;
  readonly draftRef: MutableRefObject<Partial<StyleValues>>;
  readonly shiftsRef: MutableRefObject<Shifts>;
  readonly timer: TimerRef;
  readonly inflight: MutableRefObject<Promise<void> | null>;
  readonly isAgain: MutableRefObject<boolean>;
  readonly storeDraft: (next: Partial<StyleValues>) => void;
  readonly storeShifts: (next: Shifts) => void;
  readonly setStatus: Dispatch<SetStateAction<SaveStatus>>;
}

const runStylePost = (
  core: MultiCore,
  patch: Record<string, string | null>
): void => {
  const port = core.opts.current.port.current;

  for (const selection of core.opts.current.selections) {
    port?.post({
      selector: selection.selector,
      style: patch,
      type: "preview-style",
    });
  }
};

const runResetPost = (core: MultiCore): void => {
  core.opts.current.port.current?.post({ type: "preview-reset" });
};

const stopMulti = (core: MultiCore): void => {
  stopTimer(core.timer);
  core.isAgain.current = false;
  core.storeDraft({});
  core.storeShifts({});
};

const applyMultiFailure = (core: MultiCore, error: Error): void => {
  if (isStaleSelection(error)) {
    stopMulti(core);
    runResetPost(core);
    core.opts.current.onStale(error.message);

    return;
  }

  runResetPost(core);
  core.storeDraft({});
  core.storeShifts({});
  core.setStatus({ kind: "error", message: toFailureText(error) });
};

const toPendingStyle = (core: MultiCore): Partial<StyleValues> => {
  const { values } = core.mergedRef.current;
  const style = changedProps(core.draftRef.current, values);
  const { rewrite } = core.opts.current;

  if (!rewrite || Object.keys(style).length === 0) {
    return style;
  }

  const next = changedProps(rewrite(style), values);
  const moved = changedProps(next, { ...values, ...style });

  if (Object.keys(moved).length > 0) {
    core.storeDraft({ ...core.draftRef.current, ...moved });
    runStylePost(core, moved);
  }

  return next;
};

const runMultiSend = async (
  core: MultiCore,
  directionId: string,
  items: OwnEdit[],
  sent: Shifts
): Promise<void> => {
  const { projectId, port, onCommitted } = core.opts.current;
  const edits = items.map((item) => item.edit);

  const problem = (message: string): void =>
    core.setStatus({ code: "optimistic_mismatch", kind: "error", message });

  const optimistic = edits.map((edit) =>
    startOptimistic(port.current, edit, problem)
  );

  try {
    const result = await api.directEditBatch(projectId, directionId, { edits });

    for (const [index, one] of optimistic.entries()) {
      one.saved(result.applied[index]?.tailwind);
    }

    for (const item of items) {
      onCommitted({ selector: item.edit.selector, style: item.style });
    }

    core.storeShifts(toWithoutShifts(core.shiftsRef.current, [], sent));
    core.setStatus({ at: Date.now(), kind: "saved" });
  } catch (error) {
    for (const one of optimistic) {
      one.failed(toFailureText(error as Error));
    }

    applyMultiFailure(core, error as Error);
  }
};

const runMultiFlush = async (core: MultiCore): Promise<void> => {
  core.timer.current = null;

  if (core.inflight.current) {
    core.isAgain.current = true;

    return;
  }

  const { directionId, selections } = core.opts.current;

  if (core.blockedRef.current || !directionId) {
    return;
  }

  const style = toPendingStyle(core);
  const sent = core.shiftsRef.current;
  const items = toOwnEdits(selections, core.basesRef.current, style, sent);

  if (items.length === 0) {
    return;
  }

  core.setStatus({ kind: "saving" });

  const sending = runMultiSend(core, directionId, items, sent);
  core.inflight.current = sending;
  await sending;
  core.inflight.current = null;

  if (core.isAgain.current) {
    core.isAgain.current = false;
    await runMultiFlush(core);
  }
};

const startMultiFlush = (core: MultiCore): void => {
  startTransition(async () => {
    await runMultiFlush(core);
  });
};

const applyMultiRelease = (core: MultiCore): void => {
  if (core.timer.current !== null) {
    stopTimer(core.timer);
    startMultiFlush(core);
  }
};

const runInflightDrain = async (core: MultiCore): Promise<void> => {
  const pending = core.inflight.current;

  if (!pending) {
    return;
  }

  await pending;
  await runInflightDrain(core);
};

const runMultiSettle = async (core: MultiCore): Promise<void> => {
  stopMulti(core);
  await runInflightDrain(core);
};

const runMultiDrain = async (core: MultiCore): Promise<void> => {
  if (core.timer.current !== null) {
    stopTimer(core.timer);
    await runMultiFlush(core);
  }

  await runInflightDrain(core);
};

const toDraftWithout = (
  draft: Partial<StyleValues>,
  props: readonly string[]
): Partial<StyleValues> => {
  const removed = new Set<string>(props);

  return Object.fromEntries(
    Object.entries(draft).filter(([key]) => !removed.has(key))
  );
};

export {
  applyMultiRelease,
  runInflightDrain,
  runMultiDrain,
  runMultiFlush,
  runMultiSettle,
  runResetPost,
  runStylePost,
  startMultiFlush,
  stopMulti,
  toDraftWithout,
};

export type { MultiCore, MultiOptions };
