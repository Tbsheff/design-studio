import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { RADIO_ROLE } from "./radio-role-model.js";

const ROW_ICON_SIZE = 14;

interface AppCandidateRowProps {
  readonly appDir: string;
  readonly name: string;
  readonly isChosen: boolean;
  readonly onPick: (appDir: string) => void;
}

const AppCandidateRow = ({
  appDir,
  name,
  isChosen,
  onPick,
}: AppCandidateRowProps): ReactElement => {
  const pick = useCallback((): void => {
    onPick(appDir);
  }, [appDir, onPick]);

  return (
    <button
      type="button"
      role={RADIO_ROLE}
      aria-checked={isChosen}
      className="ui-menu-item"
      onClick={pick}
    >
      {isChosen && <Icon name="check" size={ROW_ICON_SIZE} />}
      {!isChosen && <Icon name="code" size={ROW_ICON_SIZE} />}
      <span className="truncate mono">{appDir}</span>
      <span className="ui-menu-meta truncate">{name}</span>
    </button>
  );
};

export { AppCandidateRow };
