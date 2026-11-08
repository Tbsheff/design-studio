import type { FrameStatesView } from "@design-studio/contracts/frame-state";
import { Icon, usePopover } from "@design-studio/ui";
import type { ReactElement } from "react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { copy } from "./copy.js";
import {
  stop,
  menuKeys,
  StateRows,
  SessionRows,
  UserForm,
  MockForm,
} from "./frame-state-parts.js";
import type { Panel } from "./frame-state-parts.js";
import {
  frameStateOf,
  setFrameSession,
  setFrameState,
  useCurrentFrameStates,
} from "./frame-states-model.js";
import { useFrameStateSlot } from "./use-frame-state-slot.js";

const usePanelMenu = () => {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("list");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setPanel("list");

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  usePopover(open, root, close);
  useEffect(() => {
    if (open && panel === "list") {
      root.current
        ?.querySelector<HTMLButtonElement>(
          '[role^="menuitem"][aria-checked="true"]'
        )
        ?.focus();
    }
  }, [open, panel]);

  return { close, open, panel, root, setOpen, setPanel, trigger };
};

const MenuBody = ({
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
  menu: ReturnType<typeof usePanelMenu>;
  onError: (message: string | null) => void;
}): ReactElement => {
  const slot = useFrameStateSlot();

  const run = async (task: Promise<unknown>): Promise<void> => {
    onError(null);

    try {
      await task;
      menu.close(true);
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  if (menu.panel === "user") {
    return (
      <UserForm
        user={view.session.user}
        onBack={() => menu.setPanel("list")}
        onSave={async (user) => {
          await setFrameSession(projectId, { user });
          menu.close(true);
        }}
      />
    );
  }

  if (menu.panel === "mock") {
    return (
      <MockForm
        onBack={() => menu.setPanel("list")}
        onSave={async (name, rules) => {
          await setFrameState(projectId, frameId, "mock", { name, rules });
          menu.close(true);
        }}
      />
    );
  }

  return (
    <div role="menu" aria-label={copy.frameState} onKeyDown={menuKeys}>
      <StateRows
        view={view}
        chosen={chosen}
        onPick={(state) => run(setFrameState(projectId, frameId, state.id))}
      />
      <div className="ui-menu-section">
        <button
          type="button"
          role="menuitem"
          className="ui-menu-item"
          tabIndex={-1}
          onClick={() => menu.setPanel("mock")}
        >
          <Icon name="plus" size={14} />
          <span>{copy.newMockData}</span>
        </button>
      </div>
      <Suspense fallback={null}>
        {slot?.({ directionId, frameId, projectId })}
      </Suspense>
      <SessionRows
        view={view}
        onPanel={menu.setPanel}
        onSession={(change) => run(setFrameSession(projectId, change))}
      />
      <p className="frame-state-note">{copy.toSignInFor}</p>
    </div>
  );
};

const FrameStateMenu = ({
  frameId,
  frameName,
  directionId,
}: {
  frameId: string;
  frameName: string;
  directionId: string | null;
}): ReactElement | null => {
  const states = useCurrentFrameStates();
  const menu = usePanelMenu();
  const [error, setError] = useState<string | null>(null);

  if (!states) {
    return null;
  }

  const chosen = frameStateOf(states.view, frameId);
  const def = states.view.states.find((state) => state.id === chosen);
  const set = chosen !== "default";

  return (
    <div className="frame-menu-root frame-state-root" ref={menu.root}>
      <button
        ref={menu.trigger}
        type="button"
        className={`frame-chip state${set ? " set" : ""}`}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={`Preview state for ${frameName}: ${def?.name ?? chosen}`}
        onPointerDown={stop}
        onClick={() => menu.setOpen((v) => !v)}
        data-tip={
          menu.open
            ? undefined
            : "Preview state: signed in, empty, loading, error or mock data"
        }
      >
        <Icon name="sliders" size={12} />
        {set && <span className="frame-state-name">{def?.name ?? chosen}</span>}
      </button>
      {menu.open && (
        <div
          className="ui-menu project-menu canvas-menu frame-menu frame-state-menu"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <MenuBody
            projectId={states.projectId}
            frameId={frameId}
            directionId={directionId}
            view={states.view}
            chosen={chosen}
            menu={menu}
            onError={setError}
          />
          {error && <p className="frame-page-hint error">{error}</p>}
        </div>
      )}
    </div>
  );
};

export { FrameStateMenu };
