import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const ICON_SIZE = 14;

const SidebarSearch = ({
  onSearch,
}: {
  readonly onSearch: () => void;
}): ReactElement => (
  <button type="button" className="ide-search" onClick={onSearch}>
    <Icon name="search" size={ICON_SIZE} />
    <span>{copy.searchAndCommands}</span>
    <kbd>{copy.paletteKey}</kbd>
  </button>
);

export { SidebarSearch };
