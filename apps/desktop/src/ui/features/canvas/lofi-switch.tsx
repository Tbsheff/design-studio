import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const LofiSwitch = ({
  control,
}: {
  control: { on: boolean; onToggle: () => void };
}): ReactElement => {
  const { on, onToggle } = control;

  let datatip2:
    | "Show the real colors and fonts"
    | "Show this direction in grayscale with a hand-drawn font. Your files do not change." =
    "Show this direction in grayscale with a hand-drawn font. Your files do not change.";

  if (on) {
    datatip2 = "Show the real colors and fonts";
  }

  return (
    <button
      type="button"
      className="btn small ghost select-toggle lofi-toggle"
      aria-pressed={on}
      data-tip={datatip2}
      onClick={onToggle}
    >
      <Icon name="pencil" size={14} />
      <span className="label">{copy.loFiLook}</span>
    </button>
  );
};

export { LofiSwitch };
