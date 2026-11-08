import type { DirectStyleProperty } from "@design-studio/contracts";

import { shiftedPart, shiftedValue } from "./css-values.js";
import type { Shift, ShiftPart, StyleValues } from "./css-values.js";
import { DEBOUNCE_MS } from "./direct-edit-model.js";
import { stopTimer } from "./timer-model.js";
import {
  applyEditRelease,
  runEditDrain,
  runEditSettle,
  runPreviewPost,
  runSelectorPost,
  startEditFlush,
  stopEdit,
} from "./use-direct-edit-core.js";
import type { EditCore } from "./use-direct-edit-core.js";

interface PreviewActions {
  readonly absorb: (style: Partial<StyleValues>) => void;
  readonly preview: (patch: Partial<StyleValues>) => void;
  readonly previewForced: (patch: Partial<StyleValues>) => void;
  readonly previewText: (text: string) => void;
  readonly reselect: () => void;
  readonly revert: (props: DirectStyleProperty[]) => void;
  readonly revertText: () => void;
  readonly shift: (
    props: readonly DirectStyleProperty[],
    delta: number,
    bounds: Omit<Shift, "delta">,
    part: ShiftPart | null
  ) => void;
}

interface CommitActions {
  readonly commit: () => void;
  readonly commitSoon: () => void;
  readonly commitText: (selector: string, text: string) => boolean;
  readonly drain: () => Promise<void>;
  readonly reset: () => void;
  readonly settle: () => Promise<void>;
}

const toWithoutProps = (
  draft: Partial<StyleValues>,
  props: readonly DirectStyleProperty[]
): Partial<StyleValues> => {
  const removed = new Set<string>(props);

  return Object.fromEntries(
    Object.entries(draft).filter(([key]) => !removed.has(key))
  );
};

const toShiftedValue = (
  from: string,
  delta: number,
  bounds: Omit<Shift, "delta">,
  part: ShiftPart | null
): string | null => {
  if (part) {
    return shiftedPart(from, part, { ...bounds, delta });
  }

  return shiftedValue(from, { ...bounds, delta });
};

const toRevertedStyle = (
  core: EditCore,
  props: readonly DirectStyleProperty[]
): Partial<Record<DirectStyleProperty, string | null>> =>
  Object.fromEntries(
    props.map((prop) => [prop, core.baseRef.current[prop] || null])
  );

const toPreviewApplier =
  (core: EditCore, isForced: boolean) =>
  (patch: Partial<StyleValues>): void => {
    if (isForced) {
      for (const prop of Object.keys(patch) as DirectStyleProperty[]) {
        core.forced.current.add(prop);
      }
    }

    core.storeDraft({ ...core.draftRef.current, ...patch });
    runPreviewPost(core, {
      selector: core.opts.current.selection.selector,
      style: patch,
      type: "preview-style",
    });
    core.setStatus((status) => {
      if (status.kind === "error") {
        return { kind: "idle" };
      }

      return status;
    });
  };

interface TextActions {
  readonly previewText: (text: string) => void;
  readonly revertText: () => void;
}

const toTextActions = (core: EditCore): TextActions => {
  const previewText = (value: string): void => {
    core.storeTextDraft(value);
    runPreviewPost(core, {
      selector: core.opts.current.selection.selector,
      text: value,
      type: "preview-text",
    });
  };

  const revertText = (): void => {
    core.storeTextDraft(null);
    runPreviewPost(core, {
      selector: core.opts.current.selection.selector,
      text: core.opts.current.selection.text,
      type: "preview-text",
    });
  };

  return { previewText, revertText };
};

const toShiftAction =
  (core: EditCore, preview: (patch: Partial<StyleValues>) => void) =>
  (
    props: readonly DirectStyleProperty[],
    delta: number,
    bounds: Omit<Shift, "delta">,
    part: ShiftPart | null
  ): void => {
    const patch: Partial<StyleValues> = {};

    for (const prop of props) {
      const from = core.draftRef.current[prop] ?? core.baseRef.current[prop];
      const next = toShiftedValue(from, delta, bounds, part);

      if (next !== null) {
        patch[prop] = next;
      }
    }

    if (Object.keys(patch).length > 0) {
      preview(patch);
    }
  };

const toPreviewActions = (core: EditCore): PreviewActions => {
  const { previewText, revertText } = toTextActions(core);
  const preview = toPreviewApplier(core, false);
  const previewForced = toPreviewApplier(core, true);
  const shift = toShiftAction(core, preview);

  const absorb = (style: Partial<StyleValues>): void => {
    core.storeDraft(
      toWithoutProps(
        core.draftRef.current,
        Object.keys(style) as DirectStyleProperty[]
      )
    );
    core.setStatus({ at: Date.now(), kind: "saved" });
  };

  const reselect = (): void => runSelectorPost(core);

  const revert = (props: DirectStyleProperty[]): void => {
    core.storeDraft(toWithoutProps(core.draftRef.current, props));
    runPreviewPost(core, {
      selector: core.opts.current.selection.selector,
      style: toRevertedStyle(core, props),
      type: "preview-style",
    });
  };

  return {
    absorb,
    preview,
    previewForced,
    previewText,
    reselect,
    revert,
    revertText,
    shift,
  };
};

const toCommitActions = (core: EditCore): CommitActions => {
  const commit = (): void => {
    stopTimer(core.timer);
    startEditFlush(core);
  };

  const commitSoon = (): void => {
    stopTimer(core.timer);
    core.timer.current = globalThis.setTimeout(
      () => startEditFlush(core),
      DEBOUNCE_MS
    );
  };

  const commitText = (selector: string, text: string): boolean => {
    const { current } = core.opts;

    if (
      selector !== current.selection.selector ||
      !current.selection.source ||
      !current.directionId
    ) {
      return false;
    }

    stopTimer(core.timer);
    core.storeTextDraft(text);
    startEditFlush(core);

    return true;
  };

  const drain = (): Promise<void> => runEditDrain(core);

  const reset = (): void => {
    stopEdit(core);
    runPreviewPost(core, { type: "preview-reset" });
    core.setStatus({ kind: "idle" });
  };

  const settle = (): Promise<void> => runEditSettle(core);

  return { commit, commitSoon, commitText, drain, reset, settle };
};

export { applyEditRelease, toCommitActions, toPreviewActions };

export type { CommitActions, PreviewActions };
