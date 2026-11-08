import type { Project, RunRequest, Version } from "@design-studio/contracts";
import { useCallback, useMemo, useTransition } from "react";
import type { RefObject } from "react";

import { tweaksPreviewCss } from "../../../shared/tweaks.js";
import type {
  TweakControl,
  TweaksState,
  TweakValue,
} from "../../../shared/tweaks.js";
import { api, errorText } from "../../api.js";
import {
  broadcastTweakCss,
  holdTweakCssUntilReload,
} from "../design-system/token-frames.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { AGENT_BUSY_MESSAGE } from "../versions-layers-tokens/use-token-draft.js";
import { isApiConflict } from "./use-api-error.js";
import { useLatestRef } from "./use-latest-ref.js";
import { toBaseValue, useTweakDraft } from "./use-tweak-draft.js";
import type { TweakMap } from "./use-tweak-draft.js";
import { useTweaksState } from "./use-tweaks-state.js";

const TWEAKS_REQUEST: RunRequest = {
  mode: "edit",
  prompt:
    "Suggest tweaks for this design: add 3 to 8 live controls (spacing, accent color, radius, density, font size, a layout toggle) bound to CSS variables. Keep the look the same at the default values.",
  task: "tweaks",
};

interface Options {
  readonly projectId: string;
  readonly project: Project | null;
  readonly directionId: string | null;
  readonly lastChange: FilesChange | null;
  readonly onCommitted: (version: Version) => void;
}

interface UndoChain {
  readonly canUndo: boolean;
  readonly onUndo: () => void;
}

interface UseTweaksResult {
  readonly commit: () => Promise<void>;
  readonly commitError: string | null;
  readonly isCommitting: boolean;
  readonly confirmLeave: () => boolean;
  readonly count: number;
  readonly discard: () => void;
  readonly edit: (control: TweakControl, value: TweakValue) => void;
  readonly loadError: string | null;
  readonly pending: TweakMap;
  readonly revert: (id: string) => void;
  readonly state: TweaksState | null;
  readonly undoChain: (canUndo: boolean, fallback: () => void) => UndoChain;
  readonly undoLast: () => void;
  readonly values: TweakMap;
}

const toLeavePrompt = (count: number): string => {
  let noun = "changes";

  if (count === 1) {
    noun = "change";
  }

  return `Discard ${count} tweak ${noun}?`;
};

const toConfirm = (): ((text: string) => boolean) => globalThis.confirm;

const toTweakValues = (
  state: TweaksState | null,
  pending: TweakMap
): TweakMap => {
  const out: TweakMap = {};

  for (const control of state?.controls ?? []) {
    out[control.id] = pending[control.id] ?? toBaseValue(state, control);
  }

  return out;
};

interface CommitContext {
  readonly clearDraft: () => void;
  readonly replace: (state: TweaksState) => void;
  readonly setCommitError: (message: string | null) => void;
  readonly onCommitted: (version: Version) => void;
}

const runTweakCommit = async (
  ctx: CommitContext,
  projectId: string,
  directionId: string,
  values: TweakMap
): Promise<void> => {
  try {
    const result = await api.commitTweaks(projectId, directionId, values);
    ctx.replace(result.state);
    ctx.clearDraft();
    holdTweakCssUntilReload();
    ctx.onCommitted(result.version);
  } catch (error) {
    if (isApiConflict(error)) {
      ctx.setCommitError(AGENT_BUSY_MESSAGE);

      return;
    }

    ctx.setCommitError(errorText(error));
  }
};

interface TweakCommit {
  readonly commit: () => Promise<void>;
  readonly isCommitting: boolean;
}

const useTweakCommit = (
  options: Options,
  stateRef: RefObject<TweaksState | null>,
  draft: ReturnType<typeof useTweakDraft>,
  replace: (state: TweaksState) => void
): TweakCommit => {
  const [isCommitting, startCommit] = useTransition();
  const latest = useLatestRef(options);
  const { clearDraft, pendingRef, setCommitError, stopPreview } = draft;

  const commit = useCallback(async () => {
    const { projectId, directionId } = latest.current;
    const values = pendingRef.current;

    if (!directionId || Object.keys(values).length === 0) {
      return;
    }

    stopPreview();
    broadcastTweakCss(
      tweaksPreviewCss(stateRef.current?.controls ?? [], values)
    );
    setCommitError(null);

    const onCommitted = (version: Version): void =>
      latest.current.onCommitted(version);

    const job = runTweakCommit(
      {
        clearDraft,
        onCommitted,
        replace,
        setCommitError,
      },
      projectId,
      directionId,
      values
    );

    startCommit(async () => {
      await job;
    });
    await job;
  }, [
    clearDraft,
    latest,
    pendingRef,
    replace,
    setCommitError,
    stateRef,
    stopPreview,
  ]);

  return { commit, isCommitting };
};

const useTweaks = (options: Options): UseTweaksResult => {
  const { state, loadError, replace } = useTweaksState(options);
  const stateRef = useLatestRef(state);

  const draft = useTweakDraft(
    stateRef,
    broadcastTweakCss,
    `${options.projectId}:${options.directionId}`
  );

  const { commit, isCommitting } = useTweakCommit(
    options,
    stateRef,
    draft,
    replace
  );

  const { commitError, discard, edit, pending, pendingRef, revert, undoLast } =
    draft;

  const confirmLeave = useCallback(() => {
    const count = Object.keys(pendingRef.current).length;

    if (count === 0) {
      return true;
    }

    const ask = toConfirm();
    const isConfirmed = ask(toLeavePrompt(count));

    if (isConfirmed) {
      discard();
    }

    return isConfirmed;
  }, [discard, pendingRef]);

  const count = Object.keys(pending).length;

  const undoChain = (canUndo: boolean, fallback: () => void): UndoChain => ({
    canUndo: canUndo || count > 0,
    onUndo: () => {
      if (Object.keys(pendingRef.current).length > 0) {
        undoLast();

        return;
      }

      fallback();
    },
  });

  const values = useMemo(() => toTweakValues(state, pending), [state, pending]);

  return {
    commit,
    commitError,
    confirmLeave,
    count,
    discard,
    edit,
    isCommitting,
    loadError,
    pending,
    revert,
    state,
    undoChain,
    undoLast,
    values,
  };
};

type TweaksDraft = ReturnType<typeof useTweaks>;

export { TWEAKS_REQUEST, useTweaks };

export type { TweaksDraft };
