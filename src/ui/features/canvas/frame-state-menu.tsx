import { useCallback, useEffect, useRef, useState } from "react";

import type { FrameStatesView } from "../../../shared/frame-state.js";
import {
  frameStateOf,
  setFrameSession,
  setFrameState,
  useCurrentFrameStates,
} from "../../frameStates.js";
import { Icon } from "../../kit/Icon.js";
import { usePopover } from "../../usePopover.js";
import {
  type Panel,
  stop,
  menuKeys,
  StateRows,
  SessionRows,
  UserForm,
  MockForm,
} from "./frame-state-parts.js";

function usePanelMenu() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("list");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setPanel("list");
    if (refocus) trigger.current?.focus();
  }, []);
  usePopover(open, root, close);
  useEffect(() => {
    if (open && panel === "list")
      root.current
        ?.querySelector<HTMLButtonElement>(
          '[role^="menuitem"][aria-checked="true"]'
        )
        ?.focus();
  }, [open, panel]);
  return { open, setOpen, panel, setPanel, root, trigger, close };
}

function MenuBody({
  projectId,
  frameId,
  view,
  chosen,
  menu,
  onError,
}: {
  projectId: string;
  frameId: string;
  view: FrameStatesView;
  chosen: string;
  menu: ReturnType<typeof usePanelMenu>;
  onError: (message: string | null) => void;
}) {
  const run = (task: Promise<unknown>) => {
    onError(null);
    task
      .then(() => menu.close(true))
      .catch((err: unknown) =>
        onError(err instanceof Error ? err.message : String(err))
      );
  };
  if (menu.panel === "user")
    return (
      <UserForm
        user={view.session.user}
        onBack={() => menu.setPanel("list")}
        onSave={(user) =>
          setFrameSession(projectId, { user }).then(() => menu.close(true))
        }
      />
    );
  if (menu.panel === "mock")
    return (
      <MockForm
        onBack={() => menu.setPanel("list")}
        onSave={(name, rules) =>
          setFrameState(projectId, frameId, "mock", { name, rules }).then(() =>
            menu.close(true)
          )
        }
      />
    );
  return (
    <div role="menu" aria-label="Frame state" onKeyDown={menuKeys}>
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
          <span>New mock data…</span>
        </button>
      </div>
      <SessionRows
        view={view}
        onPanel={menu.setPanel}
        onSession={(change) => run(setFrameSession(projectId, change))}
      />
      <p className="frame-state-note">
        To sign in for real, sign in inside a signed-in frame. The proxy changes
        only calls from the browser. Data the app loads on the server can read
        the x-studio-state header.
      </p>
    </div>
  );
}

export function FrameStateMenu({
  frameId,
  frameName,
}: {
  frameId: string;
  frameName: string;
}) {
  const states = useCurrentFrameStates();
  const menu = usePanelMenu();
  const [error, setError] = useState<string | null>(null);
  if (!states) return null;
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
}
