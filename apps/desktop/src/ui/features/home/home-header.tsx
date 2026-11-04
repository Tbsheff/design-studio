import { BrandMark } from "@design-studio/ui";
import { Icon } from "@design-studio/ui";
import { ThemeButton } from "@design-studio/ui";
import { loadTrash } from "./lazy-parts.js";

function Header({ onTrash }: { onTrash: () => void }) {
  return (
    <header className="home-header">
      <BrandMark />
      <span className="brand">Design Studio</span>
      <div className="spacer" />
      <nav className="home-nav" aria-label="App">
        <button
          type="button"
          className="btn small ghost home-goto"
          data-tip="Find a project, folder or action"
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
}

export { Header };
