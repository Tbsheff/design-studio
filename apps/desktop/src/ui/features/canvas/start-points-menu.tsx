import type { LinksFile } from "@design-studio/contracts/links";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { startCopy } from "./copy.js";
import { StartPointsPanel } from "./start-points-panel.js";
import { usePanelMenu } from "./use-panel-menu.js";
import { useStartPointEdits } from "./use-start-points.js";

interface StartPointsMenuProps {
  readonly projectId: string;
  readonly file: LinksFile;
  readonly frames: CanvasFrame[];
  readonly activeId: string | null;
  readonly toTitle: (frame: CanvasFrame) => string;
  readonly onError: (message: string) => void;
}

const StartPointsMenu = ({
  projectId,
  file,
  frames,
  activeId,
  toTitle,
  onError,
}: StartPointsMenuProps): ReactElement => {
  const menu = usePanelMenu();
  const { root, setOpen, trigger } = menu;
  const edits = useStartPointEdits(projectId, file, onError);
  const active = frames.find((frame) => frame.id === activeId) ?? null;

  const onToggle = useCallback(
    (): void => setOpen((value) => !value),
    [setOpen]
  );

  return (
    <div className="frame-menu-root start-menu-root" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="btn small ghost"
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        aria-busy={edits.isPending}
        data-tip={startCopy.menuTip}
        data-testid="start-points-menu"
        onClick={onToggle}
      >
        <Icon name="play" size={12} />
        {startCopy.menu}
        <span className="start-count">{edits.points.length}</span>
      </button>
      {menu.open && (
        <StartPointsPanel
          edits={edits}
          frames={frames}
          active={active}
          toTitle={toTitle}
        />
      )}
    </div>
  );
};

export { StartPointsMenu };
