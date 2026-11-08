import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

const ITEM_ICON_SIZE = 14;

const CHEVRON_SIZE = 12;

interface PlusItemProps {
  readonly icon: Parameters<typeof Icon>[0]["name"];
  readonly label: string;
  readonly meta: string | null;
  readonly hasChevron: boolean;
  readonly action: () => void;
  readonly onClose: (shouldRefocus: boolean) => void;
}

const PlusItem = ({
  icon,
  label,
  meta,
  hasChevron,
  action,
  onClose,
}: PlusItemProps): ReactElement => {
  const run = useCallback((): void => {
    onClose(false);
    action();
  }, [action, onClose]);

  return (
    <button
      type="button"
      role="menuitem"
      className="ui-menu-item"
      tabIndex={-1}
      onClick={run}
    >
      <Icon name={icon} size={ITEM_ICON_SIZE} />
      <span className="truncate">{label}</span>
      {meta && <span className="ui-menu-meta">{meta}</span>}
      {hasChevron && (
        <span className="ui-menu-meta">
          <Icon name="chevronRight" size={CHEVRON_SIZE} />
        </span>
      )}
    </button>
  );
};

export { PlusItem };
