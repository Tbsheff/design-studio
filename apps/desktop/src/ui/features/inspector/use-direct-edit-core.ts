import type {
  DirectEditRequest,
  DirectStyleProperty,
  TailwindOutcome,
} from "@design-studio/contracts";
import { startTransition } from "react";
import type {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from "react";

import type { ApiError } from "../../api.js";
import { api, errorText } from "../../api.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { isApiConflict, isApiError } from "./api-error.js";
import { changedProps } from "./css-values.js";
import type { StyleValues } from "./css-values.js";
import {
  AGENT_RUNNING_MESSAGE,
  STALE_SELECTION_STATUS,
} from "./direct-edit-model.js";
import type {
  DirectEditCommit,
  Options,
  SaveStatus,
} from "./direct-edit-model.js";
import { createEditRequest } from "./edit-request-model.js";
import { editVariantStore } from "./edit-variant.js";
import { startOptimistic } from "./optimistic-edit-model.js";
import { stopTimer } from "./timer-model.js";
import type { TimerRef } from "./timer-model.js";

interface EditCore {
  readonly opts: RefObject<Options>;
  readonly baseRef: RefObject<StyleValues>;
  readonly draftRef: MutableRefObject<Partial<StyleValues>>;
  readonly textRef: MutableRefObject<string | null>;
  readonly timer: TimerRef;
  readonly inflight: MutableRefObject<Promise<void> | null>;
  readonly isAgain: MutableRefObject<boolean>;
  readonly forced: RefObject<Set<DirectStyleProperty>>;
  readonly storeDraft: (next: Partial<StyleValues>) => void;
  readonly storeTextDraft: (next: string | null) => void;
  readonly setStatus: Dispatch<SetStateAction<SaveStatus>>;
  readonly setTailwind: (outcome: TailwindOutcome | null) => void;
}

interface EditPayload {
  readonly commit: DirectEditCommit;
  readonly request: DirectEditRequest;
}

type PreviewBody = Parameters<PreviewPort["post"]>[0];

const isStaleSelection = (error: ApiError | Error): error is ApiError =>
  isApiError(error) &&
  error.status === STALE_SELECTION_STATUS &&
  error.code === "stale_selection";

const toFailureText = (error: Error): string => {
  if (isApiConflict(error)) {
    return AGENT_RUNNING_MESSAGE;
  }

  return errorText(error);
};

const runPreviewPost = (core: EditCore, body: PreviewBody): void => {
  core.opts.current.port.current?.post(body);
};

const runSelectorPost = (core: EditCore): void => {
  runPreviewPost(core, {
    selector: core.opts.current.selection.selector,
    type: "select-selector",
  });
};

const stopEdit = (core: EditCore): void => {
  stopTimer(core.timer);
  core.isAgain.current = false;
  core.forced.current.clear();
  core.storeDraft({});
  core.storeTextDraft(null);
};

const toErrorStatus = (error: Error): SaveStatus => {
  const message = toFailureText(error);

  if (isApiError(error) && error.code) {
    return { code: error.code, kind: "error", message };
  }

  return { kind: "error", message };
};

const applyEditFailure = (core: EditCore, error: Error): void => {
  if (isStaleSelection(error)) {
    stopEdit(core);
    runPreviewPost(core, { type: "preview-reset" });
    core.opts.current.onStale(error.message);

    return;
  }

  runPreviewPost(core, { type: "preview-reset" });
  core.storeDraft({});
  core.storeTextDraft(null);
  core.setStatus(toErrorStatus(error));
};

const applyRewrite = (
  core: EditCore,
  style: Partial<StyleValues>
): Partial<StyleValues> => {
  const { rewrite } = core.opts.current;

  if (!rewrite || Object.keys(style).length === 0) {
    return style;
  }

  const next = changedProps(rewrite(style), core.baseRef.current);
  const moved = changedProps(next, { ...core.baseRef.current, ...style });

  if (Object.keys(moved).length === 0) {
    return next;
  }

  core.storeDraft({ ...core.draftRef.current, ...moved });
  runPreviewPost(core, {
    selector: core.opts.current.selection.selector,
    style: moved,
    type: "preview-style",
  });

  return next;
};

const toKeptStyle = (core: EditCore): Partial<StyleValues> => {
  const kept: Partial<StyleValues> = {};

  for (const prop of core.forced.current) {
    if (prop in core.draftRef.current) {
      kept[prop] = core.draftRef.current[prop];
    }
  }

  return kept;
};

const toPendingText = (core: EditCore, current: Options): string | null => {
  const pending = core.textRef.current;

  if (pending !== null && pending !== current.selection.text) {
    return pending;
  }

  return null;
};

const toCommit = (
  request: DirectEditRequest,
  style: Partial<StyleValues>,
  text: string | null
): DirectEditCommit => {
  if (text === null) {
    return { selector: request.selector, style };
  }

  return { selector: request.selector, style, text };
};

const runEditSend = async (
  core: EditCore,
  current: Options,
  directionId: string,
  payload: EditPayload
): Promise<void> => {
  const { commit, request } = payload;

  const optimistic = startOptimistic(current.port.current, request, (message) =>
    core.setStatus({ code: "optimistic_mismatch", kind: "error", message })
  );

  try {
    const result = await api.directEdit(
      current.projectId,
      directionId,
      request
    );

    optimistic.saved(result.tailwind ?? null);
    core.setTailwind(result.tailwind ?? null);
    current.onCommitted(commit);
    core.setStatus({ at: Date.now(), kind: "saved" });
  } catch (error) {
    optimistic.failed(toFailureText(error as Error));
    applyEditFailure(core, error as Error);
  }
};

const runEditFlush = async (core: EditCore): Promise<void> => {
  core.timer.current = null;

  if (core.inflight.current) {
    core.isAgain.current = true;

    return;
  }

  const { current } = core.opts;
  const kept = toKeptStyle(core);
  core.forced.current.clear();

  const style = applyRewrite(core, {
    ...changedProps(core.draftRef.current, core.baseRef.current),
    ...kept,
  });

  const text = toPendingText(core, current);

  const request = createEditRequest(
    current.selection,
    style,
    text,
    current.variant ?? editVariantStore.get()
  );

  if (!request || !current.directionId) {
    return;
  }

  core.setStatus({ kind: "saving" });

  const sending = runEditSend(core, current, current.directionId, {
    commit: toCommit(request, style, text),
    request,
  });

  core.inflight.current = sending;
  await sending;
  core.inflight.current = null;

  if (core.isAgain.current) {
    core.isAgain.current = false;
    await runEditFlush(core);
  }
};

const startEditFlush = (core: EditCore): void => {
  startTransition(async () => {
    await runEditFlush(core);
  });
};

const runInflightDrain = async (core: EditCore): Promise<void> => {
  const pending = core.inflight.current;

  if (!pending) {
    return;
  }

  await pending;
  await runInflightDrain(core);
};

const runEditSettle = async (core: EditCore): Promise<void> => {
  stopEdit(core);
  await runInflightDrain(core);
};

const runEditDrain = async (core: EditCore): Promise<void> => {
  if (core.timer.current !== null) {
    stopTimer(core.timer);
    await runEditFlush(core);
  }

  await runInflightDrain(core);
};

const applyEditRelease = (core: EditCore): void => {
  if (core.timer.current !== null) {
    stopTimer(core.timer);
    startEditFlush(core);
  }
};

export {
  isStaleSelection,
  stopEdit,
  toFailureText,
  runEditDrain,
  startEditFlush,
  runEditFlush,
  runPreviewPost,
  runSelectorPost,
  applyEditRelease,
  runEditSettle,
};

export type { EditCore };
