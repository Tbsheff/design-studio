import type { ReactElement } from "react";

import { copy } from "./copy.js";

const RulersSwitch = ({
  control,
}: {
  control: { on: boolean; onToggle: () => void };
}): ReactElement => {
  const { on, onToggle } = control;

  let datatip4: "Hide rulers" | "Show rulers" = "Show rulers";

  if (on) {
    datatip4 = "Hide rulers";
  }

  return (
    <button
      type="button"
      className="btn small ghost select-toggle rulers-toggle"
      aria-pressed={on}
      aria-keyshortcuts="Shift+R"
      data-tip={datatip4}
      onClick={onToggle}
    >
      <svg
        className="icon"
        width={14}
        height={14}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M2.5 2.5h11v4h-11zM5 2.5v2M8 2.5v2M11 2.5v2M2.5 6.5v7h4v-7M2.5 9h2M2.5 11.5h2" />
      </svg>
      <span className="label">{copy.rulers}</span> <kbd>{copy.keyR}</kbd>
    </button>
  );
};

export { RulersSwitch };
