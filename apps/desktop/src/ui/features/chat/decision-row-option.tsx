import { useCallback } from "react";
import type { ReactElement } from "react";

import { MenuItem } from "./menu-item.js";

const DecisionRowOption = ({
  option,
  isChecked,
  onPick,
}: {
  readonly option: string;
  readonly isChecked: boolean;
  readonly onPick: (option: string) => void;
}): ReactElement => {
  const pickOption = useCallback((): void => {
    onPick(option);
  }, [onPick, option]);

  return <MenuItem label={option} checked={isChecked} onPick={pickOption} />;
};

export { DecisionRowOption };
