import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { MenuEntry } from "./card-menu-model.js";
import type { CardAction } from "./project-card-model.js";
import { toClassName } from "./project-card-model.js";

const ITEM_ICON_SIZE = 14;

interface CardMenuItemProps {
  readonly entry: MenuEntry;
  readonly register: (button: HTMLButtonElement | null) => void;
  readonly onPick: (action: CardAction) => void;
}

const CardMenuItem = ({
  entry,
  register,
  onPick,
}: CardMenuItemProps): ReactElement => {
  const pick = useCallback((): void => {
    onPick(entry.action);
  }, [entry.action, onPick]);

  return (
    <button
      ref={register}
      type="button"
      role="menuitem"
      className={toClassName(entry.isDanger && "danger")}
      onClick={pick}
    >
      <Icon name={entry.icon} size={ITEM_ICON_SIZE} />
      <span>{entry.label}</span>
      {entry.keys && <kbd aria-hidden="true">{entry.keys}</kbd>}
    </button>
  );
};

export { CardMenuItem };
