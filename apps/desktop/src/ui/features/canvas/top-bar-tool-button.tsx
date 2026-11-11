import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { CanvasTool } from "./top-bar-menu-model.js";

type ToolId = Exclude<CanvasTool, null>;

const TopBarToolButton = ({
  id,
  icon,
  label,
  current,
  shortcut,
  tip,
  isDisabled,
  pick,
}: {
  id: ToolId;
  icon: IconName;
  label: string;
  current: CanvasTool;
  shortcut: string;
  tip: string;
  isDisabled: boolean;
  pick: (tool: ToolId) => void;
}): ReactElement => {
  const choose = useCallback(() => pick(id), [pick, id]);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={current === id}
      aria-keyshortcuts={shortcut}
      disabled={isDisabled}
      data-tip={tip}
      data-tip-side="right"
      onClick={choose}
    >
      <Icon name={icon} size={14} />
      <span>{label}</span>
    </button>
  );
};

export { TopBarToolButton };

export type { ToolId };
