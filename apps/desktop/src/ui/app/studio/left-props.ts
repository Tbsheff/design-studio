import type { SelectionContext } from "@design-studio/contracts";
import type { ComponentProps } from "react";

import { api } from "../../api";
import type { FrameFocusFiles } from "../../features/canvas/index";
import { shownPending } from "../../features/chat/run-state-model";
import { toFixPrompt } from "../../features/review/index";
import type { LeftPane } from "../shell/left-pane";
import type { StudioPaneHeader } from "../shell/studio-pane-header";
import { appDirOf, kindLabel, nameOf } from "./project-model";
import { runById } from "./run-model";
import type { StudioCtx } from "./studio-context";
import { toSuggestionSlot } from "./suggestion-slot";
import { tokenEntries } from "./token-model";
import type { CanvasLayoutFrame } from "./use-mention-frames";

type LeftProps = ComponentProps<typeof LeftPane>;

const toShownDirectionName = (
  project: StudioCtx["project"],
  direction: StudioCtx["core"]["direction"]
): string | null => {
  if (project.directions.length < 2) {
    return null;
  }

  return nameOf(direction);
};

const headerProps = (
  ctx: StudioCtx
): ComponentProps<typeof StudioPaneHeader> => {
  const { projectId, project, ui, core, onExit } = ctx;
  const { data } = core;

  return {
    actionError: ui.actionError,
    connection: data.connection,
    directionName: toShownDirectionName(project, core.direction),
    kindLabel: kindLabel(project),
    name: project.name,
    onDismissError: (): void => ui.setActionError(null),
    onDuplicate: (): void => {
      void ui.act(async (): Promise<void> => {
        await api.duplicateProject(projectId);
        onExit();
      });
    },
    onExit: core.guard(onExit),
    onRename: (name: string): Promise<void> =>
      ui.act(async (): Promise<void> =>
        data.setProject(await api.renameProject(projectId, name))
      ),
    onSettings: (): void => ui.setSettingsOpen(true),
    onTrash: (): void => {
      void ui.act(async (): Promise<void> => {
        await api.trashProject(projectId);
        onExit();
      });
    },
  };
};

const chatProps = (ctx: StudioCtx): LeftProps["chat"] => {
  const { ui, core, run } = ctx;
  const { data, directionRuns, directionId } = core;

  const shown = shownPending(core.pendingRun, directionRuns, directionId);

  return {
    direction: core.direction,
    lead: core.draftChrome.banner,
    mcp: core.mcp,
    offline: data.connection === "reconnecting",
    onApprovePlan: run.approvePlan,
    onDetails: ui.setDetailsRunId,
    onRetry: run.retryRun,
    onReview: core.reviewVersionId,
    onStop: run.runControls.onCancel,
    pending: shown,
    rewind: core.rewind,
    runs: directionRuns,
    suggestions: toSuggestionSlot(ctx, shown !== null),
  };
};

const errorsProps = (ctx: StudioCtx): LeftProps["errors"] => ({
  errors: ctx.core.data.errors,
  onClear: ctx.core.data.clearErrors,
  onSendToAgent: (error: Parameters<typeof toFixPrompt>[0]): void =>
    ctx.ui.draft.set(toFixPrompt(error)),
});

const toTweaksSlash = (ctx: StudioCtx): ((ask: string) => void) | null => {
  if (appDirOf(ctx.project) !== null) {
    return null;
  }

  return (ask: string): void => {
    void ctx.run.runTweaks(ask);
  };
};

const promptProps = (
  ctx: StudioCtx,
  frameFocus: FrameFocusFiles,
  mentionFrames: readonly CanvasLayoutFrame[]
): LeftProps["prompt"] => {
  const { project, ui, core, run } = ctx;
  const { variations, chatState, draftChrome, componentList } = core;

  return {
    canvasChip: core.runCanvas.chip,
    disabled: !core.directionId,
    draft: ui.draft,
    frameFocus,
    model: project.settings.model,
    onRemoveSelection: (selector: string): void =>
      ui.setSelection((prev): SelectionContext[] =>
        prev.filter((entry): boolean => entry.selector !== selector)
      ),
    onSend: run.send,
    onSettingsSaved: core.data.setProject,
    onTweaks: toTweaksSlash(ctx),
    prefill: ui.prefill,
    projectId: ctx.projectId,
    queued: core.comments.queued.length > 0,
    running: core.activeRun !== null,
    selection: ui.selection,
    settings: project.settings,
    ...run.runControls,
    components: componentList.components,
    contextTokens: chatState.contextTokens,
    contextWindow: chatState.contextWindow,
    directionId: core.directionId,
    history: chatState.history,
    mentionFrames,
    mentionRequest: ui.mentionRequest,
    tokens: tokenEntries(core.tokens),
    variations: {
      count: variations.count,
      max: variations.max,
      onCount: variations.setCount,
      onElement: core.tryVariants,
      onSend: variations.propose,
    },
    waitReason: draftChrome.waitReason,
  };
};

const detailsProps = (ctx: StudioCtx): LeftProps["details"] => ({
  onClose: (): void => ctx.ui.setDetailsRunId(null),
  projectId: ctx.projectId,
  run: runById(ctx.core.runs, ctx.ui.detailsRunId),
});

export { chatProps, detailsProps, errorsProps, headerProps, promptProps };
