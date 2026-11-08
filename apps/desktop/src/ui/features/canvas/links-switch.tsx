import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const LinksSwitch = ({
  control,
}: {
  control: { on: boolean; onToggle: () => void };
}): ReactElement => {
  const { on, onToggle } = control;

  let datatip3: "Hide the link arrows" | "Show the link arrows" =
    "Show the link arrows";

  if (on) {
    datatip3 = "Hide the link arrows";
  }

  return (
    <button
      type="button"
      className="btn small ghost select-toggle links-toggle"
      aria-pressed={on}
      data-tip={datatip3}
      onClick={onToggle}
    >
      <Icon name="link" size={14} />
      <span className="label">{copy.linkArrows}</span>
    </button>
  );
};

export { LinksSwitch };
