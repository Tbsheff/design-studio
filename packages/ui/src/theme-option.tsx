import { useCallback } from "react";
import type { ReactElement } from "react";

import { toThemeApi } from "./theme-menu-model.js";
import type { ThemeOption, ThemePref } from "./theme-menu-model.js";

const MENU_ICON_SIZE = 14;
const ITEM_ROLE = "menuitemradio";

const ThemeOptionButton = ({
  option,
  pref,
  onClose,
}: {
  option: ThemeOption;
  pref: ThemePref;
  onClose: (refocus: boolean) => void;
}): ReactElement => {
  const choose = useCallback((): void => {
    toThemeApi()?.set(option.pref);
    onClose(true);
  }, [option.pref, onClose]);

  return (
    <button
      type="button"
      role={ITEM_ROLE}
      aria-checked={pref === option.pref}
      onClick={choose}
    >
      <svg
        className="icon"
        width={MENU_ICON_SIZE}
        height={MENU_ICON_SIZE}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={option.path} />
      </svg>
      <span>{option.label}</span>
    </button>
  );
};

export { ThemeOptionButton };
