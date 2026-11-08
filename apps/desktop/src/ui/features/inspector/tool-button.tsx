import type { ReactElement } from "react";
import { useCallback } from "react";

import type { ArrangeAction } from "../../../shared/arrange.js";
import { shortcutLabel } from "../../../shared/keymap.js";
import { IS_MAC } from "../../inspector-slots.js";
import type { Tool } from "./arrange-model.js";

interface ToolButtonProps {
  readonly tool: Tool;
  readonly isDisabled: boolean;
  readonly why: string | null;
  readonly onRun: (action: ArrangeAction) => void;
}

const toToolTip = (tool: Tool, why: string | null): string => {
  if (why) {
    return `${tool.label}: ${why}`;
  }

  return `${tool.label} ${shortcutLabel(tool.key, IS_MAC)}`;
};

const ToolButton = ({
  tool,
  isDisabled,
  why,
  onRun,
}: ToolButtonProps): ReactElement => {
  const handleToolRun = useCallback(() => onRun(tool.action), [onRun, tool]);

  return (
    <button
      type="button"
      className="ins-tool"
      aria-label={tool.label}
      aria-keyshortcuts={shortcutLabel(tool.key, false)}
      disabled={isDisabled}
      data-tip={toToolTip(tool, why)}
      onClick={handleToolRun}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={tool.glyph} />
      </svg>
    </button>
  );
};

export { ToolButton };
