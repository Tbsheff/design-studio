import { Icon } from "@design-studio/ui";
import { useCallback, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { useLive } from "../../platform/live-store.js";
import { stop } from "./frame-state-ui-model.js";
import { frameStateOf, useCurrentFrameStates } from "./frame-states-model.js";
import { MenuBody } from "./menu-body.js";
import { missedSteps, toMissedText } from "./open-steps-model.js";
import { usePanelMenu } from "./use-panel-menu.js";

const STATE_TIP =
  "Preview state: signed in, empty, loading, error or mock data";

const stopKeys = (event: KeyboardEvent<HTMLElement>): void =>
  event.stopPropagation();

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
  const { root, setOpen, trigger } = menu;
  const [error, setError] = useState<string | null>(null);
  const allMissed = useLive(missedSteps);
  const toggle = useCallback(() => setOpen((value) => !value), [setOpen]);

  if (!states) {
    return null;
  }

  const chosen = frameStateOf(states.view, frameId);
  const def = states.view.states.find((state) => state.id === chosen);
  const set = chosen !== "default";
  const missed = allMissed[chosen] ?? [];
  const isMissed = missed.length > 0;
  let part = "";
  let datatip = "";

  if (set) {
    part = " set";
  }

  if (isMissed) {
    part = `${part} warn`;
  }

  if (!menu.open) {
    datatip = STATE_TIP;
  }

  if (!menu.open && isMissed) {
    datatip = toMissedText(missed);
  }

  return (
    <div className="frame-menu-root frame-state-root" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={`frame-chip state${part}`}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={`Preview state for ${frameName}: ${def?.name ?? chosen}`}
        onPointerDown={stop}
        onClick={toggle}
        data-tip={datatip || null}
      >
        <Icon name="sliders" size={12} />
        {set && <span className="frame-state-name">{def?.name ?? chosen}</span>}
      </button>
      {menu.open && (
        <div
          className="ui-menu project-menu canvas-menu frame-menu frame-state-menu"
          role="presentation"
          onKeyDown={stopKeys}
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
          {isMissed && (
            <p className="frame-page-hint error">{toMissedText(missed)}</p>
          )}
          {error && <p className="frame-page-hint error">{error}</p>}
        </div>
      )}
    </div>
  );
};

export { FrameStateMenu };
