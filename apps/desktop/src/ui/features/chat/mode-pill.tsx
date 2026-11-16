import { useCallback, useRef } from "react";
import type { ReactElement } from "react";

import { LEVEL_FOCUS, MODES } from "./composer-menu-model.js";
import { MODE_LABEL } from "./composer-mode-model.js";
import type { ComposerMode } from "./composer-mode-model.js";
import { ComposerPill } from "./composer-pill.js";
import { copy } from "./copy.js";
import { MenuPanel } from "./menu-panel.js";
import { ModeMenuBody } from "./mode-menu-body.js";
import { useFocusOnOpen } from "./use-focus-on-open.js";
import { useMenuToggle } from "./use-menu-toggle.js";
import { usePlacedPopover } from "./use-placed-popover.js";

const MODE_SIZES = MODES.map((choice) => ({
  key: choice,
  node: MODE_LABEL[choice],
}));

const ModePill = ({
  mode,
  onMode,
  onOpen,
}: {
  mode: ComposerMode;
  onMode: (mode: ComposerMode) => void;
  onOpen: () => void;
}): ReactElement => {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menu = usePlacedPopover(trigger, panel);
  const { close } = menu;
  const onToggle = useMenuToggle(menu, onOpen);
  useFocusOnOpen(menu.open, panel, LEVEL_FOCUS);

  const handleMode = useCallback(
    (choice: ComposerMode): void => {
      close(true);
      onMode(choice);
    },
    [close, onMode]
  );

  return (
    <>
      <ComposerPill
        trigger={trigger}
        variant="mode"
        label={copy.mode}
        ariaLabel={`${copy.mode}: ${MODE_LABEL[mode]}`}
        isOpen={menu.open}
        sizes={MODE_SIZES}
        onToggle={onToggle}
      >
        {MODE_LABEL[mode]}
      </ComposerPill>
      <MenuPanel panel={panel} menu={menu} menuClass="" label={copy.mode}>
        <ModeMenuBody mode={mode} onMode={handleMode} />
      </MenuPanel>
    </>
  );
};

export { ModePill };
