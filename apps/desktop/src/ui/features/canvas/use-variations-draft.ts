import type { VariationBrief } from "@design-studio/contracts";
import { useCallback } from "react";

import {
  armAutoStart,
  dismissFlow,
  startVariations,
} from "./variations-flow.js";
import type { FlowContext } from "./variations-flow.js";
import { relabel, toPatchedDraft, toTrimmedDraft } from "./variations-model.js";
import type { BriefDraft, SessionPatch } from "./variations-model.js";

interface DraftActions {
  dismiss: () => void;
  editBrief: (
    index: number,
    patch: Partial<Pick<VariationBrief, "title" | "brief">>
  ) => void;
  removeBrief: (index: number) => void;
  skip: () => void;
  start: () => void;
}

interface DraftInput {
  readonly context: FlowContext;
  readonly draft: BriefDraft | null;
  readonly patch: (change: SessionPatch) => void;
  readonly updateDraft: (
    update: (prev: BriefDraft | null) => BriefDraft | null
  ) => void;
}

const useVariationsDraft = ({
  context,
  draft,
  patch,
  updateDraft,
}: DraftInput): DraftActions => {
  const { flow } = context;

  const editBrief = useCallback(
    (
      index: number,
      briefPatch: Partial<Pick<VariationBrief, "title" | "brief">>
    ): void => updateDraft((prev) => toPatchedDraft(prev, index, briefPatch)),
    [updateDraft]
  );

  const removeBrief = useCallback(
    (index: number): void => updateDraft((prev) => toTrimmedDraft(prev, index)),
    [updateDraft]
  );

  const start = useCallback((): void => {
    if (draft?.briefs && !draft.starting) {
      void startVariations(context, draft, relabel(draft.briefs));
    }
  }, [draft, context]);

  const skip = useCallback((): void => {
    if (!draft || draft.starting) {
      return;
    }

    if (draft.briefs && draft.result) {
      void startVariations(context, draft, draft.result.briefs);

      return;
    }

    armAutoStart(flow.current);
    patch({ draft: { ...draft, autoStart: true } });
  }, [draft, context, flow, patch]);

  const dismiss = useCallback((): void => {
    dismissFlow(flow.current);
    patch({ draft: null });
  }, [flow, patch]);

  return { dismiss, editBrief, removeBrief, skip, start };
};

export { useVariationsDraft };
