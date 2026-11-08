import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const TodoHead = ({
  isOpen,
  current,
  total,
  onToggle,
}: {
  isOpen: boolean;
  current: number;
  total: number;
  onToggle: (next: boolean) => void;
}): ReactElement => {
  const onClick = useCallback(() => onToggle(!isOpen), [isOpen, onToggle]);
  let icon: "chevronDown" | "chevronRight" = "chevronRight";

  if (isOpen) {
    icon = "chevronDown";
  }

  return (
    <button
      type="button"
      className="todo-head"
      aria-expanded={isOpen}
      onClick={onClick}
    >
      <Icon name={icon} size={12} />
      <span>{copy.todos}</span>
      <span className="todo-count tabular-nums" data-testid="todo-count">
        {current}
        {copy.of}
        {total}
      </span>
    </button>
  );
};

export { TodoHead };
