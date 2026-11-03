import { useEffect } from "react";

import type { useStudioCommands } from "../../features/commands";
import { exportTarget } from "./project-model";
import { assignRef } from "./ref-model";
import type { StudioCtx } from "./studio-context";

type CommandActions = NonNullable<
  ReturnType<typeof useStudioCommands>["current"]
>;

const makeStatesOf = (ctx: StudioCtx): CommandActions["onMakeStates"] => {
  const { core, run } = ctx;

  if (core.directionId) {
    return (): Promise<void> => run.makeStates();
  }

  return null;
};

const directionsOf = (ctx: StudioCtx): CommandActions["directions"] =>
  ctx.project.directions.map(
    (direction): CommandActions["directions"][number] => ({
      id: direction.id,
      name: direction.name,
    })
  );

const commandActionsOf = (ctx: StudioCtx): CommandActions => {
  const { ui, panes, core, run, onExit, openShip } = ctx;
  const { data, direction, versions, guard } = core;

  return {
    canRedo: core.editHistory.redo.enabled,
    canUndo: core.historyChain.canUndo,
    directionId: core.directionId,
    directions: directionsOf(ctx),
    exportId: exportTarget(versions, direction),
    onDesignMd: (): void => ui.setDesignOpen(true),
    onDirection: guard(data.setDirectionId),
    onExport: (id): void => core.exporter.open({ versionId: id }),
    onHome: guard(onExit),
    onMakeStates: makeStatesOf(ctx),
    onPanel: panes.showPane,
    onPolish: run.polish,
    onRedo: core.editHistory.redo.onRedo,
    onSettings: (): void => ui.setSettingsOpen(true),
    onShip: openShip,
    onStop: run.runControls.onCancel,
    onUndo: core.historyChain.onUndo,
    running: Boolean(core.activeRun),
  };
};

const useBindStudioCommands = (ctx: StudioCtx): void => {
  useEffect((): void => {
    assignRef(ctx.core.commandActions, commandActionsOf(ctx));
  });
};

export { useBindStudioCommands };
