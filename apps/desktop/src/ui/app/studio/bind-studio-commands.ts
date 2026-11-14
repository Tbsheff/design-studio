import { routes as imageSearchRoutes } from "@design-studio/actions/image-search/routes";
import { useEffect } from "react";

import {
  activeFrame,
  canvasStore,
  defaultLayout,
} from "../../features/canvas/index";
import type { useStudioCommands } from "../../features/commands";
import { call } from "../../platform/http";
import { openPrototypeDialog } from "../../platform/prototype-dialog";
import { uiStore } from "../../platform/storage";
import { headerProps } from "./left-props";
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

const toActivePage = (ctx: StudioCtx): string => {
  const { project } = ctx;

  const frame = activeFrame(
    canvasStore.get(project.id) ?? defaultLayout(uiStore.get().viewport)
  );

  return frame.path || project.entry;
};

const toFillMessage = (missed: readonly { query: string }[]): string =>
  `No photo slot was filled. No result for: ${missed.map((slot) => slot.query).join(", ")}.`;

const fillPhotosOf = (ctx: StudioCtx): CommandActions["onFillPhotos"] => {
  const { core, project, ui } = ctx;
  const { directionId } = core;

  if (!directionId) {
    return null;
  }

  return (): Promise<void> =>
    ui.act(async (): Promise<void> => {
      const result = await call(imageSearchRoutes.applyImageSearch, {
        directionId,
        path: toActivePage(ctx),
        projectId: project.id,
      });

      if (result.note !== null) {
        ui.setActionError(result.note);

        return;
      }

      if (result.filled.length === 0) {
        ui.setActionError(toFillMessage(result.missed));
      }
    });
};

const directionsOf = (ctx: StudioCtx): CommandActions["directions"] =>
  ctx.project.directions.map(
    (direction): CommandActions["directions"][number] => ({
      id: direction.id,
      name: direction.name,
    })
  );

const newPrototypeOf = (ctx: StudioCtx): CommandActions["onNewPrototype"] => {
  const { project } = ctx;

  if (project.app) {
    return (): void => openPrototypeDialog(project.id);
  }

  return null;
};

const commandActionsOf = (ctx: StudioCtx): CommandActions => {
  const { ui, panes, core, run, onExit, openShip } = ctx;
  const { data, direction, versions, guard } = core;
  const header = headerProps(ctx);

  return {
    canRedo: core.editHistory.redo.enabled,
    canUndo: core.historyChain.canUndo,
    directionId: core.directionId,
    directions: directionsOf(ctx),
    exportId: exportTarget(versions, direction),
    onColumn: panes.openColumn,
    onDesignMd: (): void => ui.setDesignOpen(true),
    onDirection: guard(data.setDirectionId),
    onDuplicate: header.onDuplicate,
    onExport: (id): void => core.exporter.open({ versionId: id }),
    onFillPhotos: fillPhotosOf(ctx),
    onHome: guard(onExit),
    onInspector: panes.toggleInspector,
    onMakeStates: makeStatesOf(ctx),
    onNewPrototype: newPrototypeOf(ctx),
    onPanel: panes.showPane,
    onPolish: run.polish,
    onRedo: core.editHistory.redo.onRedo,
    onSettings: (): void => ui.setSettingsOpen(true),
    onShip: openShip,
    onStop: run.runControls.onCancel,
    onTrash: header.onTrash,
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
