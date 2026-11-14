import type { StartPoint } from "@design-studio/contracts/start-points";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement } from "react";

import { startCopy } from "./copy.js";
import { toCurrentStartName } from "./start-points-model.js";
import { useMenuFit } from "./use-menu-fit.js";
import { usePanelMenu } from "./use-panel-menu.js";
import type { PlayStart } from "./use-start-points.js";

interface PlayStartMenuProps {
  readonly start: PlayStart;
}

const stopKeys = (event: KeyboardEvent<HTMLElement>): void => {
  if (event.key !== "Escape") {
    event.stopPropagation();
  }
};

const toItemNode = (
  point: StartPoint,
  currentId: string,
  onItem: (event: MouseEvent<HTMLButtonElement>) => void
): ReactElement => (
  <button
    key={point.name}
    type="button"
    role="menuitemradio"
    className="ui-menu-item"
    aria-checked={point.frame === currentId}
    data-frame={point.frame}
    data-testid="play-start-item"
    onClick={onItem}
  >
    {point.name}
  </button>
);

const PlayStartMenu = ({ start }: PlayStartMenuProps): ReactElement | null => {
  const { currentId, onPick, points } = start;
  const menu = usePanelMenu();
  const fitMenu = useMenuFit("root", null);
  const { close, root, setOpen, trigger } = menu;

  const onToggle = useCallback(
    (): void => setOpen((value) => !value),
    [setOpen]
  );

  const onItem = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const { frame = "" } = event.currentTarget.dataset;

      close(true);
      onPick(frame);
    },
    [close, onPick]
  );

  if (points.length === 0) {
    return null;
  }

  return (
    <div className="frame-menu-root start-menu-root" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="btn small ghost"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        data-tip={startCopy.playTip}
        data-testid="play-start-menu"
        onClick={onToggle}
      >
        <Icon name="play" size={12} />
        {toCurrentStartName(points, currentId)}
        <Icon name="chevronDown" size={10} />
      </button>
      {menu.open && (
        <div
          ref={fitMenu}
          className="ui-menu start-menu is-below"
          role="menu"
          tabIndex={-1}
          aria-label={startCopy.menu}
          onKeyDown={stopKeys}
        >
          <div className="ui-menu-label">{startCopy.menu}</div>
          {points.map((point) => toItemNode(point, currentId, onItem))}
        </div>
      )}
    </div>
  );
};

export { PlayStartMenu };
