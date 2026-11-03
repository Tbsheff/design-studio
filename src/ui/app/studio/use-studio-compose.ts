import { useMemo } from "react";

import { useInlineApprovals } from "../../approvalSpot";
import { useDraftChrome } from "../../components/DraftSources";
import { useStudioCommands } from "../../features/commands";
import { useChatState } from "../../useChatState";
import { useComponents } from "../../useComponents";
import { useExportTarget } from "../../useExportTarget";
import { useMcpFeed } from "../../useMcpFeed";
import { useRewind } from "../../useRewind";
import { useTryVariants } from "../../useTryVariants";
import type { StudioCore } from "./studio-core-types";
import type { StudioPanes, StudioUi } from "./studio-ui-types";
import { useStudioBase } from "./use-studio-base";
import { useStudioEdit } from "./use-studio-edit";
import { useStudioEffects } from "./use-studio-effects";
import { useStudioHistory, useStudioReview } from "./use-studio-history";

const useStudioCompose = (
  projectId: string,
  ui: StudioUi,
  panes: StudioPanes
): StudioCore => {
  const base = useStudioBase(projectId, ui);
  const edit = useStudioEdit(projectId, ui, base);

  useStudioEffects(projectId, ui, base);

  const { data, project, directionId, versions } = base;
  const scope = { projectId };
  const componentList = useComponents(projectId, directionId, data.lastChange);
  const chatState = useChatState(base.directionRuns);
  const draftChrome = useDraftChrome(projectId, project);
  const exporter = useExportTarget(projectId, base.direction, versions);
  const commandActions = useStudioCommands();
  const tryVariants = useTryVariants(project, ui.selection, base.variations);

  const rewind = useRewind({
    ...scope,
    act: ui.act,
    busy: ui.busy,
    direction: base.direction,
    guard: edit.guard,
    refreshVersions: data.refreshVersions,
    running: base.activeRun,
    seedRun: data.seedRun,
    setDirectionId: data.setDirectionId,
    status: base.status,
    versions,
  });

  const mcpFeed = useMcpFeed(projectId, directionId);

  const mcp = useMemo(
    () => ({ ...mcpFeed, locked: rewind.locked, onUndo: rewind.onRestore }),
    [mcpFeed, rewind.locked, rewind.onRestore]
  );

  useInlineApprovals(projectId, ui.paneCollapsed, panes.panel.tab);

  const history = useStudioHistory(projectId, ui, base);
  const review = useStudioReview(projectId, ui, base);

  return {
    ...base,
    ...edit,
    ...history,
    ...review,
    chatState,
    commandActions,
    componentList,
    draftChrome,
    exporter,
    mcp,
    rewind,
    tryVariants,
  };
};

export { useStudioCompose };
