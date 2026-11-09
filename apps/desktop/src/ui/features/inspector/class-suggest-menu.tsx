import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import type { SuggestRow } from "./class-suggest-model.js";
import { ClassSuggestRow } from "./class-suggest-row.js";
import { copy } from "./copy.js";
import { useMenuInView } from "./use-menu-in-view.js";

interface ClassSuggestMenuProps {
  readonly active: number;
  readonly onPick: (className: string) => void;
  readonly rows: readonly SuggestRow[];
}

const ClassSuggestMenu = ({
  active,
  onPick,
  rows,
}: ClassSuggestMenuProps): ReactElement => {
  const menuRef = useMenuInView();

  const onMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div
      ref={menuRef}
      aria-label={copy.classSuggestions}
      className="ui-menu cls-suggest"
      role="menu"
      tabIndex={-1}
      onMouseDown={onMouseDown}
    >
      {rows.map((row, index) => (
        <ClassSuggestRow
          key={row.className}
          isActive={index === active}
          row={row}
          onPick={onPick}
        />
      ))}
    </div>
  );
};

export { ClassSuggestMenu };
