import type { Direction } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { createElement, useCallback } from "react";
import type { ReactNode } from "react";

const CHECK_SIZE = 14;

interface DirectionItemProps {
  readonly dir: Direction;
  readonly isSelected: boolean;
  readonly onSelect: (id: string) => void;
}

const toItemClass = (isSelected: boolean): string => {
  if (isSelected) {
    return "list-item compact selected";
  }

  return "list-item compact ";
};

const toAriaCurrent = (isSelected: boolean): true | undefined => {
  if (isSelected) {
    return true;
  }
};

const DirectionItem = ({
  dir,
  isSelected,
  onSelect,
}: DirectionItemProps): ReactNode => {
  const handleSelect = useCallback((): void => {
    onSelect(dir.id);
  }, [dir.id, onSelect]);

  let current: ReactNode = null;

  if (isSelected) {
    current = createElement(Icon, {
      className: "dir-current",
      name: "check",
      size: CHECK_SIZE,
    });
  }

  return (
    <li>
      <button
        type="button"
        className={toItemClass(isSelected)}
        aria-current={toAriaCurrent(isSelected)}
        onClick={handleSelect}
      >
        <Icon name="branch" />
        <span className="name">{dir.name}</span>
        {current}
      </button>
    </li>
  );
};

export { DirectionItem };
