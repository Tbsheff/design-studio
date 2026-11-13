import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface ThemeControl {
  readonly dark: boolean;
  readonly onToggle: () => void;
}

const toSwitchClass = (place: "row" | "zoom"): string => {
  if (place === "zoom") {
    return "canvas-zoom-step canvas-theme";
  }

  return "icon-btn theme-switch";
};

const ThemeSwitch = ({
  control,
  place,
}: {
  readonly control: ThemeControl;
  readonly place: "row" | "zoom";
}): ReactElement => {
  const { dark, onToggle } = control;

  let datatip: string = copy.previewDarkMode;

  if (dark) {
    datatip = copy.previewDefaultMode;
  }

  return (
    <button
      type="button"
      className={toSwitchClass(place)}
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
