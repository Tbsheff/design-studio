import { BrandMark, ThemeButton } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { HomeGotoButton } from "./home-goto-button.js";
import { HomeTrashButton } from "./home-trash-button.js";

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
      <HomeGotoButton />
      <HomeTrashButton onTrash={onTrash} />
      <ThemeButton />
    </nav>
  </header>
);

export { Header };
