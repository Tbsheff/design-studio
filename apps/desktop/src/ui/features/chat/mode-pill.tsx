import type { RunEffort } from "@design-studio/contracts";
import { useRef } from "react";
import type { ReactElement } from "react";

import { LEVEL_FOCUS, NO_SIZES } from "./composer-menu-model.js";
import { MODE_LABEL } from "./composer-mode-model.js";
import type { ComposerMode } from "./composer-mode-model.js";
import { ComposerPill } from "./composer-pill.js";
import { copy } from "./copy.js";
import { MenuPanel } from "./menu-panel.js";
import { ModeMenuBody } from "./mode-menu-body.js";
import { toModeAriaLabel } from "./mode-pill-model.js";
import { useFocusOnOpen } from "./use-focus-on-open.js";
import { useMenuToggle } from "./use-menu-toggle.js";
import { usePlacedPopover } from "./use-placed-popover.js";

const ModePill = ({
  mode,
  effort,
  onMode,
  onEffort,
  onOpen,
}: {
  readonly mode: ComposerMode;
  readonly effort: RunEffort | null;
  readonly onMode: (mode: ComposerMode) => void;
  readonly onEffort: (effort: RunEffort | null) => void;
  readonly onOpen: () => void;
}): ReactElement => {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menu = usePlacedPopover(trigger, panel);
  const { close } = menu;
  const onToggle = useMenuToggle(menu, onOpen);
  useFocusOnOpen(menu.open, panel, LEVEL_FOCUS);

  return (
    <>
      <ComposerPill
        trigger={trigger}
        variant="mode"
        label={copy.mode}
        ariaLabel={toModeAriaLabel(mode, effort)}
        isOpen={menu.open}
        sizes={NO_SIZES}
        onToggle={onToggle}
      >
        {MODE_LABEL[mode]}
      </ComposerPill>
      <MenuPanel
        panel={panel}
        menu={menu}
        menuClass="mode-menu"
        label={copy.modeAndEffort}
      >
        <ModeMenuBody
          mode={mode}
          effort={effort}
          onMode={onMode}
          onEffort={onEffort}
          onClose={close}
        />
      </MenuPanel>
    </>
  );
};

export { ModePill };
