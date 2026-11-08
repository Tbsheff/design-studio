import type { ComponentProps } from "react";

import { api } from "../../api";
import { improveRequest } from "../../features/chat";
import type { DraftBar } from "../../features/chat/draft-bar";
import type { ImproveControl } from "../../features/chat/draft-improve";
import { runStoppedUnsaved } from "../shell/unfinished-model";
import type { UnfinishedSlot } from "../shell/unfinished-slot";
import type { StudioCtx } from "./studio-context";

const saveHandlerOf = (
  ctx: StudioCtx
): ComponentProps<typeof DraftBar>["onSave"] => {
  const { onSave } = ctx.core.packActions.actions;

  return (name, packId, force): Promise<void> =>
    onSave(name, packId, false, force);
};

const improveProps = (
  ctx: StudioCtx
): ComponentProps<typeof ImproveControl> => {
  const { project, ui, core, run } = ctx;

  return {
    onImprove: (focus): Promise<void> =>
      ui.act((): Promise<void> =>
        run.startRun(improveRequest(focus, project.settings.defaultLevel))
      ),
    run: core.improveRun,
    running: core.draftChrome.locked(core.activeRun !== null),
  };
};

const unfinishedProps = (
  ctx: StudioCtx
): ComponentProps<typeof UnfinishedSlot> => {
  const { projectId, ui, core } = ctx;
  const { data, status, activeRun, draftChrome } = core;

  return {
    busy: ui.busy,
    count: status?.changed.length ?? 0,
    onDiscard: (): Promise<void> =>
      core.withDid((id): Promise<void> =>
        ui.act(async (): Promise<void> =>
          data.setStatus(await api.discard(projectId, id))
        )
      ),
    onKeep: (): Promise<void> =>
      core.withDid((id): Promise<void> =>
        core.refreshAfter(async (): Promise<void> => {
          await api.keep(projectId, id);
          data.setStatus({ changed: [], dirty: false });
        })
      ),
    runStopped: runStoppedUnsaved(core.directionRuns, core.versions),
    visible: draftChrome.unfinished(Boolean(status?.dirty) && !activeRun),
  };
};

export { improveProps, saveHandlerOf, unfinishedProps };
