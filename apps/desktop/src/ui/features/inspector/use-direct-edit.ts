import type {
  DirectStyleProperty,
  TailwindOutcome,
} from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { StyleValues } from "./css-value-model.js";
import { toStyleValues } from "./css-value-model.js";
import { deleteControl, setControl } from "./direct-edit-model.js";
import type {
  DirectEdit,
  DirectEditCommit,
  DirectEditControl,
  Options,
  SaveStatus,
} from "./direct-edit-model.js";
import { NO_MIXED } from "./edit-request-model.js";
import type { TimerRef } from "./timer-model.js";
import { useCell } from "./use-cell.js";
import {
  applyEditRelease,
  toCommitActions,
  toPreviewActions,
} from "./use-direct-edit-actions.js";
import type {
  CommitActions,
  PreviewActions,
} from "./use-direct-edit-actions.js";
import { stopEdit } from "./use-direct-edit-core.js";
import type { EditCore } from "./use-direct-edit-core.js";
import { useLatestRef } from "./use-latest-ref.js";

interface DraftState {
  readonly draft: Partial<StyleValues>;
  readonly draftRef: EditCore["draftRef"];
  readonly storeDraft: (next: Partial<StyleValues>) => void;
  readonly storeTextDraft: (next: string | null) => void;
  readonly textDraft: string | null;
  readonly textRef: EditCore["textRef"];
}

const useDraftState = (): DraftState => {
  const [draft, setDraft] = useState<Partial<StyleValues>>({});
  const [textDraft, setTextDraft] = useState<string | null>(null);
  const draftRef = useCell<Partial<StyleValues>>({});
  const textRef = useCell<string | null>(null);

  const storeDraft = useCallback(
    (next: Partial<StyleValues>) => {
      draftRef.current = next;
      setDraft(next);
    },
    [draftRef]
  );

  const storeTextDraft = useCallback(
    (next: string | null) => {
      textRef.current = next;
      setTextDraft(next);
    },
    [textRef]
  );

  return { draft, draftRef, storeDraft, storeTextDraft, textDraft, textRef };
};

const useControlBinding = (
  core: EditCore,
  commits: CommitActions,
  control: Options["control"]
): void => {
  const { commitText, settle } = commits;
  const cancel = useCallback(() => stopEdit(core), [core]);

  useEffect(() => {
    setControl(control, { cancel, commitText, settle });

    return (): void => {
      deleteControl(control, cancel);
      applyEditRelease(core);
    };
  }, [cancel, commitText, settle, control, core]);
};

interface EditModel {
  readonly commits: CommitActions;
  readonly core: EditCore;
  readonly previews: PreviewActions;
}

interface ModelInput {
  readonly base: StyleValues;
  readonly drafts: DraftState;
  readonly options: Options;
  readonly setStatus: EditCore["setStatus"];
  readonly setTailwind: EditCore["setTailwind"];
}

const useEditModel = (input: ModelInput): EditModel => {
  const { base, drafts, options, setStatus, setTailwind } = input;
  const { draftRef, storeDraft, storeTextDraft, textRef } = drafts;
  const opts = useLatestRef(options);
  const baseRef = useLatestRef(base);
  const timer: TimerRef = useCell(null);
  const inflight = useCell<Promise<void> | null>(null);
  const isAgain = useCell(false);
  const isTextForced = useCell(false);
  const forced = useCell(new Set<DirectStyleProperty>());

  return useMemo(() => {
    const core: EditCore = {
      baseRef,
      draftRef,
      forced,
      inflight,
      isAgain,
      isTextForced,
      opts,
      setStatus,
      setTailwind,
      storeDraft,
      storeTextDraft,
      textRef,
      timer,
    };

    const commits = toCommitActions(core);
    const previews = toPreviewActions(core);

    return { commits, core, previews };
  }, [
    baseRef,
    draftRef,
    forced,
    inflight,
    isAgain,
    isTextForced,
    opts,
    setStatus,
    setTailwind,
    storeDraft,
    storeTextDraft,
    textRef,
    timer,
  ]);
};

const useDirectEdit = (options: Options): DirectEdit => {
  const base = useMemo(
    () => toStyleValues(options.selection.styles),
    [options.selection.styles]
  );

  const drafts = useDraftState();
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [tailwind, setTailwind] = useState<TailwindOutcome | null>(null);
  const { draft, textDraft } = drafts;

  const { commits, core, previews } = useEditModel({
    base,
    drafts,
    options,
    setStatus,
    setTailwind,
  });

  useControlBinding(core, commits, options.control);

  const values = useMemo(() => ({ ...base, ...draft }), [base, draft]);

  const dirty = useMemo(
    () => Object.keys(draft) as DirectStyleProperty[],
    [draft]
  );

  const text = textDraft ?? options.selection.text;

  const scope = useMemo(
    () => ({ directionId: options.directionId, projectId: options.projectId }),
    [options.projectId, options.directionId]
  );

  return {
    ...previews,
    commit: commits.commit,
    commitSoon: commits.commitSoon,
    dirty,
    drain: commits.drain,
    each: null,
    mixed: NO_MIXED,
    reset: commits.reset,
    scope,
    status,
    tailwind,
    text,
    values,
  };
};

export { useDirectEdit };

export type { DirectEdit, DirectEditCommit, DirectEditControl, SaveStatus };
