import type { DirectStyleProperty } from "@design-studio/contracts";

import type { StyleValues } from "./css-values.js";
import { DEBOUNCE_MS } from "./direct-edit-model.js";
import type { SaveStatus } from "./direct-edit-model.js";
import {
  insertShift,
  toShiftedStyle,
  toWithoutShifts,
} from "./mixed-values.js";
import type { Shift, ShiftPart, Shifts } from "./mixed-values.js";
import { stopTimer } from "./timer-model.js";
import {
  runMultiDrain,
  runMultiSettle,
  runResetPost,
  runStylePost,
  startMultiFlush,
  stopMulti,
  toDraftWithout,
} from "./use-direct-edits-core.js";
import type { MultiCore } from "./use-direct-edits-core.js";

interface MultiEditActions {
  readonly absorb: (style: Partial<StyleValues>) => void;
  readonly commit: () => void;
  readonly commitSoon: () => void;
  readonly drain: () => Promise<void>;
  readonly preview: (patch: Partial<StyleValues>) => void;
  readonly previewForced: (patch: Partial<StyleValues>) => void;
  readonly reset: () => void;
  readonly revert: (props: DirectStyleProperty[]) => void;
  readonly settle: () => Promise<void>;
  readonly shift: (
    props: readonly DirectStyleProperty[],
    delta: number,
    bounds: Omit<Shift, "delta">,
    part: ShiftPart | null
  ) => void;
}

const toIdleStatus = (status: SaveStatus): SaveStatus => {
  if (status.kind === "error") {
    return { kind: "idle" };
  }

  return status;
};

const toOnlyShifts = (
  next: Shifts,
  props: readonly DirectStyleProperty[]
): Shifts =>
  Object.fromEntries(
    props.flatMap((prop) => {
      const entry = next[prop];

      if (entry) {
        return [[prop, entry]];
      }

      return [];
    })
  );

const runShiftedPost = (core: MultiCore, only: Shifts): void => {
  const port = core.opts.current.port.current;

  for (const [index, selection] of core.opts.current.selections.entries()) {
    const own = core.basesRef.current[index];

    if (own) {
      const shifted = toShiftedStyle(own, only);

      if (Object.keys(shifted).length > 0) {
        port?.post({
          selector: selection.selector,
          style: shifted,
          type: "preview-style",
        });
      }
    }
  }
};

const runRevertedPost = (
  core: MultiCore,
  props: readonly DirectStyleProperty[]
): void => {
  const port = core.opts.current.port.current;

  for (const [index, selection] of core.opts.current.selections.entries()) {
    const own = core.basesRef.current[index];

    const reverted = Object.fromEntries(
      props.map((prop) => [prop, own?.[prop] || null])
    );

    port?.post({
      selector: selection.selector,
      style: reverted,
      type: "preview-style",
    });
  }
};

const toMultiPreview =
  (core: MultiCore) =>
  (patch: Partial<StyleValues>): void => {
    if (core.blockedRef.current) {
      return;
    }

    if (Object.keys(patch).some((prop) => prop in core.shiftsRef.current)) {
      core.storeShifts(
        toWithoutShifts(core.shiftsRef.current, Object.keys(patch), {})
      );
    }

    core.storeDraft({ ...core.draftRef.current, ...patch });
    runStylePost(core, patch);
    core.setStatus(toIdleStatus);
  };

const toMultiShift =
  (core: MultiCore) =>
  (
    props: readonly DirectStyleProperty[],
    delta: number,
    bounds: Omit<Shift, "delta">,
    part: ShiftPart | null
  ): void => {
    if (core.blockedRef.current) {
      return;
    }

    const next = insertShift(
      core.shiftsRef.current,
      props,
      delta,
      bounds,
      part
    );

    core.storeShifts(next);
    core.storeDraft(toDraftWithout(core.draftRef.current, props));
    runShiftedPost(core, toOnlyShifts(next, props));
    core.setStatus(toIdleStatus);
  };

const toMultiRevert =
  (core: MultiCore) =>
  (props: DirectStyleProperty[]): void => {
    core.storeDraft(toDraftWithout(core.draftRef.current, props));
    core.storeShifts(toWithoutShifts(core.shiftsRef.current, props, {}));
    runRevertedPost(core, props);
  };

const toMultiAbsorb =
  (core: MultiCore) =>
  (style: Partial<StyleValues>): void => {
    const props = Object.keys(style);
    core.storeDraft(toDraftWithout(core.draftRef.current, props));
    core.storeShifts(toWithoutShifts(core.shiftsRef.current, props, {}));
    core.setStatus({ at: Date.now(), kind: "saved" });
  };

const toMultiEditActions = (core: MultiCore): MultiEditActions => {
  const preview = toMultiPreview(core);

  const commit = (): void => {
    stopTimer(core.timer);
    startMultiFlush(core);
  };

  const commitSoon = (): void => {
    stopTimer(core.timer);
    core.timer.current = globalThis.setTimeout(
      () => startMultiFlush(core),
      DEBOUNCE_MS
    );
  };

  const reset = (): void => {
    stopMulti(core);
    runResetPost(core);
    core.setStatus({ kind: "idle" });
  };

  const absorb = toMultiAbsorb(core);
  const drain = (): Promise<void> => runMultiDrain(core);
  const revert = toMultiRevert(core);
  const settle = (): Promise<void> => runMultiSettle(core);
  const shift = toMultiShift(core);
  const previewForced = preview;

  return {
    absorb,
    commit,
    commitSoon,
    drain,
    preview,
    previewForced,
    reset,
    revert,
    settle,
    shift,
  };
};

export { toMultiEditActions };

export type { MultiEditActions };
