import { useCallback } from "react";
import type { ReactElement } from "react";

import { vectorTool } from "./vector-tool-model.js";
import type { VECTOR_TOOLS } from "./vector-tool-model.js";

const PEN_SHORTCUT = "Shift+P";

const VectorToolButton = ({
  item,
  isActive,
  isDisabled,
}: {
  item: (typeof VECTOR_TOOLS)[number];
  isActive: boolean;
  isDisabled: boolean;
}): ReactElement => {
  let shortcut: string = item.keyLabel;

  if (item.id === "pen") {
    shortcut = PEN_SHORTCUT;
  }

  const toggle = useCallback(() => vectorTool.toggle(item.id), [item.id]);

  return (
    <button
      type="button"
      aria-label={item.label}
      aria-pressed={isActive}
      disabled={isDisabled}
      aria-keyshortcuts={shortcut}
      data-tip={`${item.label} ${item.keyLabel}`}
      onClick={toggle}
    >
      <svg
        className="icon"
        width={14}
        height={14}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d={item.glyph} />
      </svg>
    </button>
  );
};

export { VectorToolButton };
