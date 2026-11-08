import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { LISTBOX_ROLE } from "./aria-role-model.js";
import { SlashItem } from "./slash-item.js";
import type { SlashMenuView } from "./slash-menu-model.js";

const SlashList = ({ view }: { view: SlashMenuView }): ReactElement => {
  const { current, onHover, optionId, rows } = view;

  const onMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      if (event.movementX === 0 && event.movementY === 0) {
        return;
      }

      const id = (event.target as HTMLElement).closest('[role="option"]')?.id;
      const row = rows.find((item) => optionId(item) === id);

      if (row && row !== current) {
        onHover(row);
      }
    },
    [rows, optionId, current, onHover]
  );

  return (
    <div
      tabIndex={0}
      role={LISTBOX_ROLE}
      id={view.listId}
      aria-label={view.label}
      className="slash-list"
      onMouseMove={onMouseMove}
    >
      {rows.map((row, at) => (
        <SlashItem key={row.key} row={row} at={at} view={view} />
      ))}
    </div>
  );
};

export { SlashList };
