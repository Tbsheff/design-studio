import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import type { ThemePref } from "./use-theme-pref";

interface AppThemeOptionProps {
  readonly isSelected: boolean;
  readonly label: string;
  readonly onPick: (pref: ThemePref) => void;
  readonly pref: ThemePref;
}

const RADIO_ROLE = "radio";

const AppThemeOption = ({
  isSelected,
  label,
  onPick,
  pref,
}: AppThemeOptionProps): ReactElement => {
  const pickPref = useCallback((): void => onPick(pref), [onPick, pref]);

  return (
    <button
      type="button"
      role={RADIO_ROLE}
      aria-checked={isSelected}
      className={pick(isSelected, "on", "")}
      onClick={pickPref}
    >
      {label}
    </button>
  );
};

export { AppThemeOption };
