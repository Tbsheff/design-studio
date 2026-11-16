import { Suspense, createElement } from "react";
import type { ReactNode } from "react";

import { SuggestionChips } from "../../features/suggestion/index";
import { focusComposer } from "../../platform/focus";
import type { StudioCtx } from "./studio-context";

type DirectionRun = StudioCtx["core"]["directionRuns"][number];

const toFinishedRun = (
  ctx: StudioCtx,
  hasPending: boolean
): DirectionRun | null => {
  const { activeRun, directionRuns } = ctx.core;
  const last = directionRuns.at(-1) ?? null;

  if (activeRun !== null || hasPending || last === null) {
    return null;
  }

  if (
    last.status !== "completed" ||
    last.summary === null ||
    last.request?.plan === true
  ) {
    return null;
  }

  return last;
};

const toSuggestionSlot = (ctx: StudioCtx, hasPending: boolean): ReactNode => {
  const { directionId } = ctx.core;
  const last = toFinishedRun(ctx, hasPending);

  if (directionId === null || last === null) {
    return null;
  }

  const handlePick = (prompt: string): void => {
    ctx.ui.draft.set(prompt);
    globalThis.requestAnimationFrame((): void => focusComposer(prompt));
  };

  return createElement(
    Suspense,
    { fallback: null },
    createElement(SuggestionChips, {
      ids: { directionId, projectId: ctx.projectId, runId: last.runId },
      key: last.runId,
      onPick: handlePick,
    })
  );
};

export { toSuggestionSlot };
