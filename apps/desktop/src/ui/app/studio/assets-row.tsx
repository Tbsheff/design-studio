import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { commandBlocker, runCommand } from "../../features/commands";

interface AssetsRowProps {
  readonly commandId: string;
  readonly icon: IconName;
  readonly label: string;
}

const AssetsRow = ({
  commandId,
  icon,
  label,
}: AssetsRowProps): ReactElement => {
  const blocker = commandBlocker(commandId);

  const runRow = useCallback((): void => {
    runCommand(commandId);
  }, [commandId]);

  return (
    <button
      type="button"
      className="column-row"
      disabled={blocker !== null}
      data-tip={blocker ?? label}
      data-tip-align="start"
      onClick={runRow}
    >
      <Icon name={icon} size={14} />
      <span className="truncate">{label}</span>
    </button>
  );
};

export { AssetsRow };
