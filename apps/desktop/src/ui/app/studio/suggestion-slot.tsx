import { Suspense, createElement } from "react";
import type { ReactNode } from "react";

import { SuggestionChips } from "../../features/suggestion/index";
import { focusComposer } from "../../platform/focus";
import { appDirOf } from "./project-model";
import type { StudioCtx } from "./studio-context";

type DirectionRun = StudioCtx["core"]["directionRuns"][number];

const isEditRun = (run: DirectionRun): boolean => {
  const request = run.request ?? run.summary?.request ?? null;

  if (request === null || request.plan === true) {
    return false;
  }

  return request.mode === "edit";
};

const toFinishedRun = (
  ctx: StudioCtx,
  hasPending: boolean
): DirectionRun | null => {
  const { activeRun, directionRuns } = ctx.core;
  const last = directionRuns.at(-1) ?? null;

  if (activeRun !== null || hasPending || last === null) {
    return null;
  }

  if (last.status !== "completed" || last.summary === null) {
    return null;
  }

  if (!isEditRun(last)) {
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

  const tweakCount = ctx.core.tweaks.state?.controls.length ?? null;

  const handleTweaks = (): void => {
    if (tweakCount === 0) {
      void ctx.run.runTweaks("");

      return;
    }

    ctx.run.openTweaks();
  };

  const handlePick = (prompt: string): void => {
    ctx.ui.draft.set(prompt);
    globalThis.requestAnimationFrame((): void => focusComposer(prompt));
  };

  return createElement(
    Suspense,
    { fallback: null },
    createElement(SuggestionChips, {
      ids: { directionId, projectId: ctx.projectId, runId: last.runId },
      isAppProject: appDirOf(ctx.project) !== null,
      key: last.runId,
      onPick: handlePick,
      onTweaks: handleTweaks,
      tweakCount,
    })
  );
};

export { toSuggestionSlot };
