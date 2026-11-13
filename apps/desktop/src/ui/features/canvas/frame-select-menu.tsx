import { Icon } from "@design-studio/ui";
import { useCallback, useEffect } from "react";
import type { KeyboardEvent, PointerEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { menuKeys, toRootMenuItems } from "./frame-menu-model.js";
import { FrameMenuRows } from "./frame-menu-rows.js";
import { useFrameSelectMenu } from "./use-frame-select-menu.js";

interface FrameSelectMenuProps {
  readonly ids: readonly string[];
  readonly removeFramesAt: (ids: readonly string[]) => void;
}

const stopPointer = (event: PointerEvent<HTMLDivElement>): void =>
  event.stopPropagation();

const FrameSelectMenu = ({
  ids,
  removeFramesAt,
}: FrameSelectMenuProps): ReactElement => {
  const { menu, rows, toggle } = useFrameSelectMenu(ids, removeFramesAt);
  const { close, open, root, trigger } = menu;

  const handleKeys = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      event.stopPropagation();
      menuKeys(event, close);
    },
    [close]
  );

  useEffect(() => {
    if (open && root.current) {
      toRootMenuItems(root.current)[0]?.focus();
    }
  }, [open, root]);

  let datatip: string | null = copy.frameSelectTip;

  if (open) {
    datatip = null;
  }

  return (
    <div className="frame-select-root" ref={root} onPointerDown={stopPointer}>
      <button
        ref={trigger}
        type="button"
        className="frame-select-count"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="frame-select-count"
        data-tip={datatip}
        onClick={toggle}
      >
        {ids.length}
        {copy.frameSelectCount}
        <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <div
          className="ui-menu project-menu canvas-menu frame-menu frame-select-menu"
          role="menu"
          tabIndex={-1}
          aria-label={copy.frameSelectMenu}
          onKeyDown={handleKeys}
        >
          <FrameMenuRows rows={rows} close={close} />
        </div>
      )}
    </div>
  );
};

export { FrameSelectMenu };
