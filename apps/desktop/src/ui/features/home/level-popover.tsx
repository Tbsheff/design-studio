import { RUN_LEVELS } from "@design-studio/contracts";
import type { RunLevel } from "@design-studio/contracts";
import type { ReactElement, RefObject } from "react";

import { copy } from "./copy.js";
import { LevelChoice } from "./home-popovers.js";
import { Pop } from "./pop.js";
import type { Close } from "./pop.js";
import { moveFocusInMenu } from "./popover-focus-model.js";

interface LevelPopoverProps {
  readonly trigger: RefObject<HTMLElement | null>;
  readonly onClose: Close;
  readonly level: RunLevel;
  readonly onLevel: (level: RunLevel) => void;
  readonly isClosing: boolean;
}

const LevelPopover = ({
  trigger,
  onClose,
  level,
  onLevel,
  isClosing,
}: LevelPopoverProps): ReactElement => (
  <Pop
    trigger={trigger}
    closing={isClosing}
    onClose={onClose}
    variant="home-level-pop"
    label="Level"
    role="menu"
    onKeyDown={moveFocusInMenu}
  >
    <fieldset className="ui-menu-section" aria-label={copy.level}>
      <span className="ui-menu-label">{copy.level}</span>
      {RUN_LEVELS.map((item) => (
        <LevelChoice
          key={item}
          item={item}
          level={level}
          onLevel={onLevel}
          onClose={onClose}
        />
      ))}
    </fieldset>
  </Pop>
);

export { LevelPopover };

export type { LevelPopoverProps };
