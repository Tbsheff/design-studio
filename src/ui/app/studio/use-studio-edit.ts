import { useEffect, useRef } from "react";

import { undoAllowed } from "../../features/canvas/use-undo-shortcut";
import {
  useEditHistory,
  useSelectionRefresh,
} from "../../features/inspector/use-edit-history";
import { useTweaks } from "../../features/inspector/use-tweaks";
import { useStudioTokens } from "../../features/versions-layers-tokens/use-studio-tokens";
import { setLeaveCheck } from "../../platform/router";
import { uiStore } from "../../platform/storage";
import { setProjectSwitcher } from "../project-nav";
import type { StudioBase, StudioEdit } from "./studio-core-types";
import type { StudioUi } from "./studio-ui-types";

const switchProject = (projectId: string | null): void => {
  if (projectId) {
    uiStore.set({ activeProjectId: projectId });

    return;
  }

  uiStore.set({ activeProjectId: null, screen: "home" });
};

const useStudioGuards = (
  guard: ReturnType<typeof useStudioTokens>["guard"],
  leaveCheck: ReturnType<typeof useStudioTokens>["draft"]["confirmLeave"]
): void => {
  useEffect((): (() => void) => {
    setLeaveCheck(leaveCheck);

    return (): void => setLeaveCheck(null);
  }, [leaveCheck]);
  const guardRef = useRef(guard);

  useEffect((): void => {
    guardRef.current = guard;
  });

  useEffect(
    (): (() => void) =>
      setProjectSwitcher((id): Promise<void> =>
        guardRef.current(switchProject)(id)
      ),
    []
  );
};

const useStudioEdit = (
  projectId: string,
  ui: StudioUi,
  base: StudioBase
): StudioEdit => {
  const { data, directionId, versions, activeRun, comments } = base;
  const scope = { directionId, projectId };
  const { editControl, port, setSelection } = ui;

  const canUndo = undoAllowed(
    directionId,
    ui.busy || activeRun !== null,
    versions.length
  );

  const refreshSelection = useSelectionRefresh(
    ui.selection,
    setSelection,
    comments.describeRef,
    {
      change: data.lastChange,
      directionId: base.directionId,
      dropDrafts: (): void => {
        editControl.current?.cancel();
      },
    }
  );

  const editHistory = useEditHistory({
    ...scope,
    before: async (): Promise<void> => {
      await editControl.current?.settle();
      refreshSelection(false);
      port.current?.post({ type: "preview-reset" });
      port.current?.post({ type: "optimistic-drop" });
    },
    direction: base.direction,
    locked: activeRun !== null,
    onError: ui.setActionError,
    onStepped: (): void => {
      refreshSelection(true);
      data.refreshVersions();
    },
    versions: base.versions,
  });

  const tweaks = useTweaks({
    ...scope,
    lastChange: data.lastChange,
    onCommitted: (): void => data.refreshVersions(),
    project: base.project,
  });

  const historyChain = editHistory.undoChain(canUndo, (): void =>
    ui.undoRef.current()
  );

  const studioTokens = useStudioTokens({
    ...scope,
    tokens: base.tokens,
    ...tweaks.undoChain(historyChain.canUndo, historyChain.onUndo),
    onCommitted: (): void => data.refreshVersions(),
    redo: editHistory.redo,
  });

  const { guard } = studioTokens;

  useStudioGuards(guard, studioTokens.draft.confirmLeave);

  return {
    editHistory,
    guard,
    historyChain,
    studioTokens,
    tweaks,
  };
};

export { useStudioEdit };
