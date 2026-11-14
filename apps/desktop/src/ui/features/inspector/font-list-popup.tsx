import { useCallback, useMemo } from "react";
import type { MouseEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { toFontGroups } from "./font-list-model.js";
import type { FontRow } from "./font-list-model.js";
import { FontListRow } from "./font-list-row.js";
import { useMenuInView } from "./use-menu-in-view.js";

interface FontListPopupProps {
  readonly active: number;
  readonly onPick: (row: FontRow) => void;
  readonly rows: readonly FontRow[];
}

const FontListPopup = ({
  active,
  onPick,
  rows,
}: FontListPopupProps): ReactElement => {
  const menuRef = useMenuInView();
  const groups = useMemo(() => toFontGroups(rows), [rows]);

  const onMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div
      ref={menuRef}
      aria-label={copy.fontList}
      className="ui-menu cls-suggest font-list"
      role="menu"
      tabIndex={-1}
      onMouseDown={onMouseDown}
    >
      {groups.map((group) => (
        <div key={group.label} className="ui-menu-section">
          <div className="ui-menu-label">{group.label}</div>
          {group.rows.map((row, index) => (
            <FontListRow
              key={`${row.source}:${row.family}`}
              isActive={group.start + index === active}
              row={row}
              onPick={onPick}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export { FontListPopup };
