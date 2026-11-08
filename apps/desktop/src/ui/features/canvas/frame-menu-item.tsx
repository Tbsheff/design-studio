import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

interface FrameMenuEntry {
  readonly disabled?: string;
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

const FrameMenuItemButton = ({
  entry,
  close,
}: {
  entry: FrameMenuEntry;
  close: (refocus: boolean) => void;
}): ReactElement => {
  const { run } = entry;

  const choose = useCallback((): void => {
    close(true);
    run();
  }, [close, run]);

  let part: "" | " has-hint" = "";

  if (entry.disabled) {
    part = " has-hint";
  }

  return (
    <button
      type="button"
      role="menuitem"
      className={`ui-menu-item${part}`}
      tabIndex={-1}
      disabled={Boolean(entry.disabled)}
      onClick={choose}
    >
      <Icon name={entry.icon} size={14} />
      <span>{entry.label}</span>
      {entry.disabled && <span className="ui-menu-hint">{entry.disabled}</span>}
    </button>
  );
};

export { FrameMenuItemButton };

export type { FrameMenuEntry };
