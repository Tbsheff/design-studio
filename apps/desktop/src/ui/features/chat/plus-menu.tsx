import { Icon } from "@design-studio/ui";
import { useCallback, useRef } from "react";
import type { MouseEvent, ReactElement } from "react";

import { ITEM_FOCUS } from "./composer-menu-model.js";
import type { PlusMenuProps } from "./composer-menu-model.js";
import type { ComposerMode } from "./composer-mode-model.js";
import { copy } from "./copy.js";
import { MenuPanel } from "./menu-panel.js";
import { PlusMenuBody } from "./plus-menu-body.js";
import { useFocusOnOpen } from "./use-focus-on-open.js";
import { useMenuToggle } from "./use-menu-toggle.js";
import { usePlacedPopover } from "./use-placed-popover.js";

const stopMouseDown = (event: MouseEvent): void => event.stopPropagation();

const PlusMenu = (props: PlusMenuProps): ReactElement => {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menu = usePlacedPopover(trigger, panel);
  const onClick = useMenuToggle(menu, props.onOpen ?? null);
  const { close } = menu;
  useFocusOnOpen(menu.open, panel, ITEM_FOCUS);

  const onAct = useCallback(
    (run: () => void) => (): void => {
      close(false);
      run();
    },
    [close]
  );

  const { onMode } = props;

  const pickMode = useCallback(
    (choice: ComposerMode): void => {
      close(true);
      onMode(choice);
    },
    [close, onMode]
  );

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="icon-btn small bordered composer-plus"
        aria-label={copy.addAndSettings}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        data-testid="composer-plus"
        data-tip={copy.attachMentionSkills}
        data-tip-side="top"
        data-tip-align="start"
        onMouseDown={stopMouseDown}
        onClick={onClick}
      >
        <Icon name="plus" size={16} />
      </button>
      <MenuPanel
        panel={panel}
        menu={menu}
        menuClass=""
        label={copy.addAndSettings}
      >
        <PlusMenuBody menuProps={props} onAct={onAct} onPickMode={pickMode} />
      </MenuPanel>
    </>
  );
};

export { PlusMenu };
