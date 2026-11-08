import type { SelectionContext } from "@design-studio/contracts";
import type { ComponentProps } from "react";

import { api } from "../../api";
import { shownPending } from "../../features/chat/run-state-model";
import { setRailToggled as toggleRail } from "../../features/home/index.js";
import { toFixPrompt } from "../../features/review/index";
import { uiStore } from "../../platform/storage";
import type { LeftPane } from "../shell/left-pane";
import type { StudioPaneHeader } from "../shell/studio-pane-header";
import { kindLabel, nameOf } from "./project-model";
import { runById } from "./run-model";
import type { StudioCtx } from "./studio-context";
import { tokenEntries } from "./token-model";

type LeftProps = ComponentProps<typeof LeftPane>;

const headerProps = (
  ctx: StudioCtx
): ComponentProps<typeof StudioPaneHeader> => {
  const { projectId, project, ui, panes, core, onExit } = ctx;
  const { data, comments } = core;

  return {
    actionError: ui.actionError,
    commentCount: comments.queued.length,
    connection: data.connection,
    directionName: nameOf(core.direction),
    hasComponents: true,
    hasTokens: core.studioTokens.panel !== null,
    hasTweaks: true,
    kindLabel: kindLabel(project),
    name: project.name,
    onCollapse: (): void => uiStore.set({ paneCollapsed: true }),
    onDesignMd: (): void => ui.setDesignOpen(true),
    onDismissError: (): void => ui.setActionError(null),
    onExit: core.guard(onExit),
    onRename: (name: string): Promise<void> =>
      ui.act(async (): Promise<void> =>
        data.setProject(await api.renameProject(projectId, name))
      ),
    onSettings: (): void => ui.setSettingsOpen(true),
    onTab: panes.showPane,
    onToggleRail: toggleRail,
    railOpen: ui.rail === "open",
    tab: panes.panel.tab,
  };
};

const chatProps = (ctx: StudioCtx): LeftProps["chat"] => {
  const { ui, core, run } = ctx;
  const { data, directionRuns, directionId } = core;

  return {
    busy: ui.busy,
    direction: core.direction,
    lead: core.draftChrome.banner,
    mcp: core.mcp,
    offline: data.connection === "reconnecting",
    onApprovePlan: run.approvePlan,
    onDetails: ui.setDetailsRunId,
    onPolish: run.polish,
    onRetry: run.retryRun,
    onReview: core.reviewVersionId,
    onStop: run.runControls.onCancel,
    pending: shownPending(core.pendingRun, directionRuns, directionId),
    rewind: core.rewind,
    running: core.activeRun !== null,
    runs: directionRuns,
  };
};

const errorsProps = (ctx: StudioCtx): LeftProps["errors"] => ({
  errors: ctx.core.data.errors,
  onClear: ctx.core.data.clearErrors,
  onSendToAgent: (error: Parameters<typeof toFixPrompt>[0]): void =>
    ctx.ui.draft.set(toFixPrompt(error)),
});

const promptProps = (ctx: StudioCtx): LeftProps["prompt"] => {
  const { project, ui, core, run } = ctx;
  const { variations, chatState, draftChrome, componentList } = core;

  return {
    canvasChip: core.runCanvas.chip,
    disabled: !core.directionId,
    draft: ui.draft,
    model: project.settings.model,
    onRemoveSelection: (selector: string): void =>
      ui.setSelection((prev): SelectionContext[] =>
        prev.filter((entry): boolean => entry.selector !== selector)
      ),
    onSend: run.send,
    onSettingsSaved: core.data.setProject,
    prefill: ui.prefill,
    projectId: ctx.projectId,
    queued: core.comments.queued.length > 0,
    running: core.activeRun !== null,
    selection: ui.selection,
    settings: project.settings,
    ...run.runControls,
    components: componentList.components,
    contextTokens: chatState.contextTokens,
    directionId: core.directionId,
    history: chatState.history,
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

const tweaksProps = (ctx: StudioCtx): LeftProps["tweaks"] => ({
  draft: ctx.core.tweaks,
  isRunning: ctx.core.activeRun !== null,
  onSuggest: (): Promise<void> => ctx.run.suggestTweaks(),
});

const detailsProps = (ctx: StudioCtx): LeftProps["details"] => ({
  onClose: (): void => ctx.ui.setDetailsRunId(null),
  projectId: ctx.projectId,
  run: runById(ctx.core.runs, ctx.ui.detailsRunId),
});

export {
  chatProps,
  detailsProps,
  errorsProps,
  headerProps,
  promptProps,
  tweaksProps,
};
