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
    <span className="brand">Design Studio</span>
    <div className="spacer" />
    <nav className="home-nav" aria-label={copy.app}>
      <button
        type="button"
        className="btn small ghost home-goto"
        data-tip={copy.findAProjectFolderOr}
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("studio:command-layer", { detail: "palette" })
          )
        }
      >
        <Icon name="search" size={14} />
        Go to
        <kbd aria-hidden="true">⌘K</kbd>
      </button>
      <button
        type="button"
        className="btn small ghost"
        onPointerEnter={() => void loadTrash()}
        onClick={onTrash}
      >
        <Icon name="trash" size={14} />
        Trash
      </button>
      <ThemeButton />
    </nav>
  </header>
);

export { Header };
