import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ItemProps } from "./composer-menu-model.js";

const MENU_ICON_SIZE = 14;

const toItemClass = (hasNote: boolean): string => {
  if (hasNote) {
    return "ui-menu-item has-hint";
  }

  return "ui-menu-item";
};

const toItemRole = (isRadio: boolean): string => {
  if (isRadio) {
    return "menuitemradio";
  }

  return "menuitem";
};

const MenuItem = ({
  icon,
  label,
  meta,
  checked,
  disabledReason,
  hint,
  onPick,
}: ItemProps): ReactElement => {
  const isOff = Boolean(disabledReason);
  const note = disabledReason ?? hint;

  const pickItem = useCallback((): void => {
    if (!isOff) {
      onPick();
    }
  }, [isOff, onPick]);

  return (
    <button
      type="button"
      className={toItemClass(Boolean(note))}
      role={toItemRole(checked === true || checked === false)}
      aria-checked={checked}
      aria-disabled={isOff}
      tabIndex={-1}
      onClick={pickItem}
    >
      {icon && <Icon name={icon} size={MENU_ICON_SIZE} />}
      <span>{label}</span>
      {note && <span className="ui-menu-hint">{note}</span>}
      {meta && <span className="ui-menu-meta">{meta}</span>}
    </button>
  );
};

export { MenuItem };
