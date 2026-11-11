import type {
  RunLevel,
  SelectionContext,
  VariationBrief,
} from "@design-studio/contracts";
import { useCallback, useMemo, useRef, useState } from "react";

import { formatUsd } from "../../domain/format.js";
import { writeStored } from "../../platform/storage.js";
import { useVariationsDraft } from "./use-variations-draft.js";
import { useVariationsRemote } from "./use-variations-remote.js";
import type { KeptVariation } from "./use-variations-remote.js";
import { useVariationsSession } from "./use-variations-session.js";
import {
  proposeBriefs,
  proposeElementBriefs,
  toProjectMax,
  toWantedCount,
} from "./variations-flow.js";
import type { Flow, FlowContext } from "./variations-flow.js";
import { toStoredCount } from "./variations-model.js";
import type { BriefDraft, Options, SessionPatch } from "./variations-model.js";

const COUNT_KEY = "studio.variations.count";

interface VariationsState {
  ask: SelectionContext | null;
  askElement: (element: SelectionContext | null) => void;
  cancelAll: (groupId: string) => Promise<void>;
  clearNotice: () => void;
  count: number;
  dismiss: () => void;
  draft: BriefDraft | null;
  editBrief: (
    index: number,
    patch: Partial<Pick<VariationBrief, "title" | "brief">>
  ) => void;
  groupId: string | null;
  keepElement: (groupId: string, directionId: string) => Promise<KeptVariation>;
  keepNotice: (message: string | null) => void;
  kept: string | null;
  max: number;
  mix: (
    fromDirectionId: string,
    toDirectionId: string,
    element: SelectionContext,
    level: RunLevel
  ) => Promise<string>;
  notice: string | null;
  propose: (
    prompt: string,
    level: RunLevel,
    attachmentIds: string[],
    requestedCount?: number
  ) => Promise<void>;
  proposeElement: (
    element: SelectionContext,
    note: string,
    requestedCount: number,
    level: RunLevel
  ) => Promise<void>;
  removeBrief: (index: number) => void;
  setCount: (next: number) => void;
  setGroupId: (groupId: string | null) => void;
  skip: () => void;
  start: () => void;
}

const money = formatUsd;

const toSessionSetters = (
  patch: (change: SessionPatch) => void
): Pick<
  VariationsState,
  "askElement" | "clearNotice" | "keepNotice" | "setGroupId"
> => ({
  askElement: (element) => patch({ ask: element }),
  clearNotice: () => patch({ notice: null }),
  keepNotice: (message) => patch({ kept: message }),
  setGroupId: (groupId) => patch({ groupId }),
});

const useProposals = (
  context: FlowContext,
  defaultCount: number
): Pick<VariationsState, "propose" | "proposeElement"> => {
  const propose = useCallback(
    (
      prompt: string,
      level: RunLevel,
      attachmentIds: string[],
      requestedCount?: number
    ): Promise<void> => {
      const count = toWantedCount(
        defaultCount,
        requestedCount ?? null,
        context.settings.current.project
      );

      return proposeBriefs(context, { attachmentIds, count, level, prompt });
    },
    [context, defaultCount]
  );

  const proposeElement = useCallback(
    (
      element: SelectionContext,
      note: string,
      requestedCount: number,
      level: RunLevel
    ): Promise<void> =>
      proposeElementBriefs(context, {
        count: requestedCount,
        element,
        level,
        note,
      }),
    [context]
  );

  return { propose, proposeElement };
};

const useVariations = (input: Options): VariationsState => {
  const [savedCount, setSavedCount] = useState(toStoredCount);
  const control = useVariationsSession(input);
  const { options: settings, patch, session, updateDraft } = control;

  const flow = useRef<Flow>({ autoStart: false, request: 0 });
  const max = toProjectMax(input.project);
  const count = Math.min(savedCount, max);

  const context = useMemo<FlowContext>(
    () => ({ flow, patch, settings }),
    [flow, patch, settings]
  );

  const setCount = useCallback((next: number): void => {
    setSavedCount(next);
    writeStored(COUNT_KEY, String(next));
  }, []);

  const remote = useVariationsRemote(settings);
  const proposals = useProposals(context, count);
  const { draft } = session;

  const draftActions = useVariationsDraft({
    context,
    draft,
    patch,
    updateDraft,
  });

  const setters = useMemo(() => toSessionSetters(patch), [patch]);

  return {
    ...draftActions,
    ...proposals,
    ...remote,
    ...setters,
    ask: session.ask,
    count,
    draft,
    groupId: session.groupId,
    kept: session.kept,
    max,
    notice: session.notice,
    setCount,
  };
};

export { money, useVariations };

export type { BriefDraft, VariationsState };
