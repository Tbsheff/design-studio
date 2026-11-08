import type {
  DirectEditResult,
  SelectionContext,
  SourceLoc,
} from "@design-studio/contracts";
import { useCallback } from "react";

import { api, errorText } from "../../api.js";
import { COPY } from "./copy.js";
import type { EditContext } from "./layer-edit-context.js";
import {
  toDirectEditRequest,
  toLocKey,
  toPreviewStyle,
} from "./layer-edits-model.js";
import type { LayerChange } from "./layer-edits-types.js";

interface ApplyOutcome {
  readonly change: LayerChange;
  readonly head: string | null;
  readonly nodeId: number | null;
  readonly result: DirectEditResult;
  readonly source: SourceLoc;
  readonly target: SelectionContext;
  readonly token: string | null;
}

interface ApplyRequest {
  readonly change: LayerChange;
  readonly nodeId: number | null;
  readonly target: SelectionContext;
}

type LayerApply = (
  target: SelectionContext,
  change: LayerChange,
  nodeId: number | null
) => Promise<void>;

const toMovedSelection = (
  selection: SelectionContext[],
  selector: string,
  moved: SourceLoc
): SelectionContext[] =>
  selection.map((entry) => {
    if (entry.selector === selector) {
      return { ...entry, source: moved };
    }

    return entry;
  });

const settleApply = (
  context: EditContext,
  clearHidden: (nodeId: number) => void,
  outcome: ApplyOutcome
): void => {
  const { change, head, nodeId, result, source, target, token } = outcome;
  const { liveRef, notify, reselect } = context;
  const { moved } = result;

  if (result.version.id === head) {
    if (nodeId !== null) {
      clearHidden(nodeId);
    }

    if ("hidden" in change && !change.hidden) {
      notify(COPY.noticeHiddenElsewhere);
    }

    return;
  }

  if (moved) {
    liveRef.current.setSelection((previous) =>
      toMovedSelection(previous, target.selector, moved)
    );
  }

  reselect.beginReselect({
    fromSelector: target.selector,
    loc: toLocKey(moved ?? source),
    move: "move" in change,
    tag: target.tag.toLowerCase(),
    text: target.text,
    token,
  });
};

const runApply = async (
  context: EditContext,
  clearHidden: (nodeId: number) => void,
  request: ApplyRequest
): Promise<void> => {
  const { change, nodeId, target } = request;
  const { busy, liveRef, notify, reselect } = context;
  const { current } = liveRef;
  const { directionId } = current;
  const { source } = target;

  if (!current.enabled || !directionId || busy.isBusy()) {
    return;
  }

  if (!source) {
    notify(COPY.noticeNoSource);

    return;
  }

  busy.claimBusy();
  reselect.clearReselect();

  if ("hidden" in change) {
    current.frames.post(toPreviewStyle(target.selector, change.hidden));
  }

  const token = current.frames.frontToken;
  const head = current.headVersionId;

  try {
    const result = await api.directEdit(
      current.projectId,
      directionId,
      toDirectEditRequest(target, source, change)
    );

    settleApply(context, clearHidden, {
      change,
      head,
      nodeId,
      result,
      source,
      target,
      token,
    });
  } catch (error) {
    if ("hidden" in change) {
      current.frames.post(toPreviewStyle(target.selector, !change.hidden));
    }

    notify(errorText(error));
  } finally {
    busy.releaseBusy();
  }
};

const useLayerApply = (
  context: EditContext,
  clearHidden: (nodeId: number) => void
): LayerApply =>
  useCallback(
    (
      target: SelectionContext,
      change: LayerChange,
      nodeId: number | null
    ): Promise<void> =>
      runApply(context, clearHidden, { change, nodeId, target }),
    [clearHidden, context]
  );

export { useLayerApply };

export type { LayerApply };
