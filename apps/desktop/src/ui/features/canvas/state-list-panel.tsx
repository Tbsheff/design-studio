import type {
  FrameStateDef,
  FrameStatesView,
} from "@design-studio/contracts/frame-state";
import { Suspense, useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { StateRows } from "./frame-state-parts.js";
import { menuKeys } from "./frame-state-ui-model.js";
import { setFrameSession, setFrameState } from "./frame-states-model.js";
import { KeepOpenSection } from "./keep-open-section.js";
import { NewMockRow } from "./new-mock-row.js";
import { SessionRows } from "./session-rows.js";
import { useFrameStateSlot } from "./use-frame-state-slot.js";
import type { PanelMenu } from "./use-panel-menu.js";

const StateListPanel = ({
  projectId,
  frameId,
  directionId,
  view,
  chosen,
  menu,
  onError,
}: {
  projectId: string;
  frameId: string;
  directionId: string | null;
  view: FrameStatesView;
  chosen: string;
  menu: PanelMenu;
  onError: (message: string | null) => void;
}): ReactElement => {
  const slot = useFrameStateSlot();
  const { close, setPanel } = menu;
  const openMock = useCallback(() => setPanel("mock"), [setPanel]);

  const run = useCallback(
    async (task: Promise<unknown>): Promise<void> => {
      onError(null);

      try {
        await task;
        close(true);
      } catch (error: unknown) {
        if (error instanceof Error) {
          onError(error.message);

          return;
        }

        onError(String(error));
      }
    },
    [onError, close]
  );

  const pick = useCallback(
    (state: FrameStateDef) => run(setFrameState(projectId, frameId, state.id)),
    [run, projectId, frameId]
  );

  const changeSession = useCallback(
    (change: Parameters<typeof setFrameSession>[1]) =>
      run(setFrameSession(projectId, change)),
    [run, projectId]
  );

  return (
    <div
      role="menu"
      tabIndex={-1}
      aria-label={copy.frameState}
      onKeyDown={menuKeys}
    >
      <StateRows view={view} chosen={chosen} onPick={pick} />
      <NewMockRow onOpen={openMock} />
      <KeepOpenSection
        chosen={chosen}
        frameId={frameId}
        projectId={projectId}
        run={run}
        view={view}
      />
      <Suspense fallback={null}>
        {slot?.({ directionId, frameId, projectId })}
      </Suspense>
      <SessionRows view={view} onPanel={setPanel} onSession={changeSession} />
      <p className="frame-state-note">{copy.toSignInFor}</p>
    </div>
  );
};

export { StateListPanel };
