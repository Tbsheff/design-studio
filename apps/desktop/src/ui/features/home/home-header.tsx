import { BrandMark, Icon, ThemeButton } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { loadTrash } from "./lazy-parts.js";

const Header = ({
  onTrash,
}: {
  readonly onTrash: () => void;
}): ReactElement => (
  <header className="home-header">
    <BrandMark />
    <span className="brand">{copy.designStudio}</span>
    <div className="spacer" />
    <nav className="home-nav" aria-label={copy.app}>
      <button
        type="button"
        className="btn small ghost home-goto"
        data-tip={copy.findAProjectFolderOr}
        onClick={() =>
          globalThis.dispatchEvent(
            new CustomEvent("studio:command-layer", { detail: "palette" })
          )
        }
      >
        <Icon name="search" size={14} />
        {copy.goTo}
        <kbd aria-hidden="true">{copy.textK}</kbd>
      </button>
      <button
        type="button"
        className="btn small ghost"
        onPointerEnter={() => loadTrash()}
        onClick={onTrash}
      >
        <Icon name="trash" size={14} />
        {copy.trash}
      </button>
      <ThemeButton />
    </nav>
  </header>
);

export { Header };
