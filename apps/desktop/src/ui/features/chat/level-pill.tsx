import { RUN_LEVELS } from "@design-studio/contracts";
import type { RunLevel } from "@design-studio/contracts";
import { useRef } from "react";
import type { ReactElement } from "react";

import { LEVEL_FOCUS } from "./composer-menu-model.js";
import { ComposerPill } from "./composer-pill.js";
import { copy } from "./copy.js";
import { LevelMenuBody } from "./level-menu-body.js";
import { levelLabel } from "./level-model.js";
import { MenuPanel } from "./menu-panel.js";
import { useFocusOnOpen } from "./use-focus-on-open.js";
import { useMenuToggle } from "./use-menu-toggle.js";
import { usePlacedPopover } from "./use-placed-popover.js";

const LEVEL_SIZES = RUN_LEVELS.map((runLevel) => ({
  key: levelLabel(runLevel),
  node: levelLabel(runLevel),
}));

const LevelPill = ({
  level,
  onLevel,
  onOpen,
}: {
  level: RunLevel;
  onLevel: (level: RunLevel) => void;
  onOpen?: () => void;
}): ReactElement => {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menu = usePlacedPopover(trigger, panel);
  const { close } = menu;
  const onToggle = useMenuToggle(menu, onOpen ?? null);
  useFocusOnOpen(menu.open, panel, LEVEL_FOCUS);

  return (
    <>
      <ComposerPill
        trigger={trigger}
        variant="level"
        label={copy.level}
        ariaLabel={`Level: ${levelLabel(level)}`}
        isOpen={menu.open}
        sizes={LEVEL_SIZES}
        onToggle={onToggle}
      >
        {levelLabel(level)}
      </ComposerPill>
      <MenuPanel
        panel={panel}
        menu={menu}
        menuClass="level-menu"
        label={copy.level}
      >
        <LevelMenuBody level={level} onLevel={onLevel} onClose={close} />
      </MenuPanel>
    </>
  );
};

export { LevelPill };
