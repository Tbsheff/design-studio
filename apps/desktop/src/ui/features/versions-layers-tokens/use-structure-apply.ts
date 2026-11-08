import type {
  StructureEditRequest,
  StructureEditResult,
} from "@design-studio/contracts";
import { useCallback } from "react";

import { api, errorText } from "../../api.js";
import type { EditContext } from "./layer-edit-context.js";
import { toLocKey } from "./layer-edits-model.js";

interface StructureOutcome {
  readonly head: string | null;
  readonly result: StructureEditResult;
  readonly token: string | null;
}

const settleStructure = (
  context: EditContext,
  outcome: StructureOutcome
): void => {
  const { head, result, token } = outcome;
  const [first] = result.select;
  const { liveRef, reselect } = context;

  if (result.version.id === head) {
    return;
  }

  if (!first) {
    liveRef.current.setSelection(() => []);

    return;
  }

  reselect.beginReselect({
    fromSelector: liveRef.current.selection.at(-1)?.selector ?? "",
    loc: toLocKey(first),
    move: true,
    tag: first.tag,
    text: "",
    token,
  });
};

const runStructure = async (
  context: EditContext,
  request: StructureEditRequest
): Promise<void> => {
  const { busy, liveRef, notify, reselect } = context;
  const { current } = liveRef;
  const { directionId } = current;

  if (
    !current.enabled ||
    !directionId ||
    busy.isBusy() ||
    reselect.hasPendingMove()
  ) {
    return;
  }

  busy.claimBusy();
  reselect.clearReselect();
  const token = current.frames.frontToken;
  const head = current.headVersionId;

  try {
    const result = await api.structureEdit(
      current.projectId,
      directionId,
      request
    );

    settleStructure(context, { head, result, token });
  } catch (error) {
    notify(errorText(error));
  } finally {
    busy.releaseBusy();
  }
};

const useStructureApply = (
  context: EditContext
): ((request: StructureEditRequest) => Promise<void>) =>
  useCallback(
    (request: StructureEditRequest): Promise<void> =>
      runStructure(context, request),
    [context]
  );

export { useStructureApply };
