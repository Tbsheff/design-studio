import type { StructureEditRequest } from "@design-studio/contracts";
import { startTransition, useCallback } from "react";

import { toReplaceStep } from "./copy-paste-model.js";
import type { ReplaceNotice, WaitingLayers } from "./copy-paste-model.js";
import { COPY } from "./copy.js";
import type { EditContext } from "./layer-edit-context.js";
import type { StructureDeps } from "./layer-structure-deps.js";

interface PasteReplaceInput {
  readonly applyStructure: (request: StructureEditRequest) => Promise<void>;
  readonly context: EditContext;
  readonly deps: StructureDeps;
  readonly waiting: WaitingLayers | null;
}

const toNoticeText = (notice: ReplaceNotice, noSource: string): string => {
  if (notice === "changed") {
    return COPY.noticeReplaceChanged;
  }

  if (notice === "other-file") {
    return COPY.noticeReplaceOtherFile;
  }

  if (notice === "no-source") {
    return noSource;
  }

  return COPY.noticeCopyFirst;
};

const usePasteReplace = (input: PasteReplaceInput): (() => void) => {
  const { applyStructure, context, deps, waiting } = input;
  const { liveRef, notify } = context;

  return useCallback((): void => {
    const { current } = liveRef;

    const step = toReplaceStep({
      head: current.headVersionId,
      slots: deps.selectionTargets(current.selection),
      waiting,
    });

    if (step.kind === "notice") {
      notify(toNoticeText(step.notice, deps.noSource));

      return;
    }

    startTransition(async () => {
      await applyStructure(step.request);
    });
  }, [applyStructure, deps, liveRef, notify, waiting]);
};

export { usePasteReplace };
