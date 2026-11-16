import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface ThemeControl {
  readonly dark: boolean;
  readonly onToggle: () => void;
}

const ThemeSwitch = ({
  control,
}: {
  readonly control: ThemeControl;
}): ReactElement => {
  const { dark, onToggle } = control;

  let datatip: string = copy.previewDarkMode;

  if (dark) {
    datatip = copy.previewDefaultMode;
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
      <Icon name="moon" size={14} />
    </button>
  );
};

export { ThemeSwitch };

export type { ThemeControl };
