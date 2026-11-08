import { Icon } from "@design-studio/ui";
import type { ReactElement, RefObject } from "react";

import { ChipFileIcon } from "./chip-file-icon.js";

const AppChipMain = ({
  name,
  label,
  tip,
  isMenuOpen,
  onMenu,
  triggerRef,
}: {
  readonly name: string;
  readonly label: string;
  readonly tip: string;
  readonly isMenuOpen: boolean;
  readonly onMenu: () => void;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
}): ReactElement => (
  <button
    ref={triggerRef}
    type="button"
    className="home-chip-app"
    aria-haspopup="dialog"
    aria-expanded={isMenuOpen}
    aria-label={`App options for ${name}`}
    data-tip={tip}
    data-tip-align="start"
    onClick={onMenu}
  >
    <ChipFileIcon />
    <b className="truncate">{name}</b>
    <span className="home-chip-host truncate">{label}</span>
    <Icon name="chevronDown" size={12} />
  </button>
);

export { AppChipMain };
