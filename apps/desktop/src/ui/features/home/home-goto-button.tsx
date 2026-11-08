import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const openPalette = (): void => {
  globalThis.dispatchEvent(
    new CustomEvent("studio:command-layer", { detail: "palette" })
  );
};

const HomeGotoButton = (): ReactElement => (
  <button
    type="button"
    className="btn small ghost home-goto"
    data-tip={copy.findAProjectFolderOr}
    onClick={openPalette}
  >
    <Icon name="search" size={14} />
    {copy.goTo}
    <kbd aria-hidden="true">{copy.textK}</kbd>
  </button>
);

export { HomeGotoButton };
