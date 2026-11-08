import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const ThemeSwitch = ({
  control,
}: {
  control: { dark: boolean; onToggle: () => void };
}): ReactElement => {
  const { dark, onToggle } = control;

  let datatip: "Preview dark mode" | "Back to the default mode" =
    "Preview dark mode";

  if (dark) {
    datatip = "Back to the default mode";
  }

  return (
    <button
      type="button"
      className="icon-btn theme-switch"
      aria-label={copy.previewDarkMode}
      aria-pressed={dark}
      data-tip={datatip}
      onClick={onToggle}
    >
      <Icon name="moon" />
    </button>
  );
};

export { ThemeSwitch };
