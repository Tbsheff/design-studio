import type { DirectStyleProperty } from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { StyleValues } from "./css-value-model.js";
import { toStyleValues } from "./css-value-model.js";
import { deleteControl, setControl } from "./direct-edit-model.js";
import type { DirectEdit, SaveStatus } from "./direct-edit-model.js";
import { toMergedValues, toMultiBlockReason } from "./mixed-values-model.js";
import type { MergedValues, Shifts } from "./mixed-values-model.js";
import { useCell } from "./use-cell.js";
import { toMultiEditActions } from "./use-direct-edits-actions.js";
import type { MultiEditActions } from "./use-direct-edits-actions.js";
import { applyMultiRelease, stopMulti } from "./use-direct-edits-core.js";
import type { MultiCore, MultiOptions } from "./use-direct-edits-core.js";
import { useLatestRef } from "./use-latest-ref.js";

interface MultiDraft {
  readonly draft: Partial<StyleValues>;
  readonly draftRef: MultiCore["draftRef"];
  readonly shiftedProps: readonly DirectStyleProperty[];
  readonly shiftsRef: MultiCore["shiftsRef"];
  readonly storeDraft: MultiCore["storeDraft"];
  readonly storeShifts: MultiCore["storeShifts"];
}

const useMultiDraft = (): MultiDraft => {
  const [draft, setDraft] = useState<Partial<StyleValues>>({});

  const [shiftedProps, setShiftedProps] = useState<
    readonly DirectStyleProperty[]
  >([]);

  const draftRef = useCell<Partial<StyleValues>>({});
  const shiftsRef = useCell<Shifts>({});

  const storeDraft = useCallback(
    (next: Partial<StyleValues>) => {
      draftRef.current = next;
      setDraft(next);
    },
    [draftRef]
  );

  const storeShifts = useCallback(
    (next: Shifts) => {
      shiftsRef.current = next;
      setShiftedProps(Object.keys(next) as DirectStyleProperty[]);
    },
    [shiftsRef]
  );

  return { draft, draftRef, shiftedProps, shiftsRef, storeDraft, storeShifts };
};

interface MultiModel {
  readonly actions: MultiEditActions;
  readonly core: MultiCore;
}

interface MultiModelInput {
  readonly blocked: string | null;
  readonly bases: StyleValues[];
  readonly drafts: MultiDraft;
  readonly merged: MergedValues;
  readonly options: MultiOptions;
  readonly setStatus: MultiCore["setStatus"];
}

const useMultiModel = (input: MultiModelInput): MultiModel => {
  const { bases, blocked, drafts, merged, options, setStatus } = input;
  const { draftRef, shiftsRef, storeDraft, storeShifts } = drafts;
  const opts = useLatestRef(options);
  const basesRef = useLatestRef(bases);
  const mergedRef = useLatestRef(merged);
  const blockedRef = useLatestRef(blocked);
  const timer = useCell<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useCell<Promise<void> | null>(null);
  const isAgain = useCell(false);

  return useMemo(() => {
    const core: MultiCore = {
      basesRef,
      blockedRef,
      draftRef,
      inflight,
      isAgain,
      mergedRef,
      opts,
      setStatus,
      shiftsRef,
      storeDraft,
      storeShifts,
      timer,
    };

    const actions = toMultiEditActions(core);

    return { actions, core };
  }, [
    basesRef,
    blockedRef,
    draftRef,
    inflight,
    isAgain,
    mergedRef,
    opts,
    setStatus,
    shiftsRef,
    storeDraft,
    storeShifts,
    timer,
  ]);
};

const useMultiControl = (
  core: MultiCore,
  actions: MultiEditActions,
  control: MultiOptions["control"]
): void => {
  const { settle } = actions;
  const cancel = useCallback(() => stopMulti(core), [core]);
  const commitText = useCallback(() => false, []);

  useEffect(() => {
    setControl(control, { cancel, commitText, settle });

    return (): void => {
      deleteControl(control, cancel);
      applyMultiRelease(core);
    };
  }, [cancel, commitText, settle, control, core]);
};

const runNoop = (): null => null;

const toUnmixed = (
  merged: MergedValues,
  draft: Partial<StyleValues>
): ReadonlySet<DirectStyleProperty> => {
  const drafted = new Set<string>(Object.keys(draft));

  return new Set([...merged.mixed].filter((prop) => !drafted.has(prop)));
};

interface MultiDerived {
  readonly dirty: DirectStyleProperty[];
  readonly mixed: ReadonlySet<DirectStyleProperty>;
  readonly values: StyleValues;
}

const useMultiDerived = (
  merged: MergedValues,
  draft: Partial<StyleValues>,
  shiftedProps: readonly DirectStyleProperty[]
): MultiDerived => {
  const values = useMemo(
    () => ({ ...merged.values, ...draft }),
    [merged, draft]
  );

  const mixed = useMemo(() => toUnmixed(merged, draft), [merged, draft]);

  const dirty = useMemo(
    () => [
      ...new Set([
        ...(Object.keys(draft) as DirectStyleProperty[]),
        ...shiftedProps,
      ]),
    ],
    [draft, shiftedProps]
  );

  return { dirty, mixed, values };
};

const useDirectEdits = (
  options: MultiOptions
): DirectEdit & { readonly blocked: string | null } => {
  const bases = useMemo(
    () =>
      options.selections.map((selectionContext) =>
        toStyleValues(selectionContext.styles)
      ),
    [options.selections]
  );

  const merged = useMemo(() => toMergedValues(bases), [bases]);

  const blocked = useMemo(
    () => toMultiBlockReason(options.selections),
    [options.selections]
  );

  const drafts = useMultiDraft();
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const { draft, shiftedProps } = drafts;

  const { actions, core } = useMultiModel({
    bases,
    blocked,
    drafts,
    merged,
    options,
    setStatus,
  });

  useMultiControl(core, actions, options.control);

  const derived = useMultiDerived(merged, draft, shiftedProps);
  const { dirty, mixed, values } = derived;

  const scope = useMemo(
    () => ({ directionId: options.directionId, projectId: options.projectId }),
    [options.projectId, options.directionId]
  );

  const { absorb, commit, commitSoon, drain, preview, previewForced } = actions;

  const { reset, revert, shift } = actions;
  const { port } = options;
  const each = bases;
  const previewText = runNoop;
  const reselect = runNoop;
  const revertText = runNoop;
  const tailwind = null;
  const text = "";

  return {
    absorb,
    blocked,
    commit,
    commitSoon,
    dirty,
    drain,
    each,
    mixed,
    port,
    preview,
    previewForced,
    previewText,
    reselect,
    reset,
    revert,
    revertText,
    scope,
    shift,
    status,
    tailwind,
    text,
    values,
  };
};

export { useDirectEdits };
