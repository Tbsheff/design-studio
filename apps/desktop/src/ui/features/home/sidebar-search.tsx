import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { prefetchCommandLayer } from "../../app/screen-preload.js";
import { copy } from "./copy.js";

const ICON_SIZE = 14;

const startCommandPrefetch = (): void => {
  void prefetchCommandLayer();
};

const SidebarSearch = ({
  onSearch,
}: {
  readonly onSearch: () => void;
}): ReactElement => (
  <button
    type="button"
    className="ide-search"
    onClick={onSearch}
    onFocus={startCommandPrefetch}
    onPointerEnter={startCommandPrefetch}
  >
    <Icon name="search" size={ICON_SIZE} />
    <span>{copy.searchAndCommands}</span>
    <kbd>{copy.paletteKey}</kbd>
  </button>
);

export { SidebarSearch };
