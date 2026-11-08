import { useCallback, useEffect, useRef } from "react";
import type { ReactElement } from "react";

import { OPTION_ROLE } from "./aria-role-model.js";
import { toOptionAria, toRowHeading } from "./slash-menu-model.js";
import type { Row, SlashMenuView } from "./slash-menu-model.js";
import { SlashRowBody } from "./slash-row-body.js";

const SlashItem = ({
  row,
  at,
  view,
}: {
  row: Row;
  at: number;
  view: SlashMenuView;
}): ReactElement => {
  const option = useRef<HTMLButtonElement>(null);
  const isCurrent = row === view.current;
  const aria = toOptionAria(row, view.current);
  const heading = toRowHeading(view.rows, at, Boolean(view.heading));
  const { onPick } = view;
  const pick = useCallback(() => onPick(row), [onPick, row]);

  useEffect(() => {
    if (isCurrent) {
      option.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isCurrent]);

  return (
    <div role="presentation" className="slash-item">
      {heading && (
        <div className="slash-heading" role="presentation" aria-hidden="true">
          {heading}
        </div>
      )}
      <button
        ref={option}
        type="button"
        tabIndex={0}
        id={view.optionId(row)}
        role={OPTION_ROLE}
        aria-selected={isCurrent}
        aria-checked={aria.checked}
        aria-disabled={aria.disabled}
        aria-description={aria.description}
        aria-label={aria.label}
        className="slash-row"
        data-highlighted={aria.highlighted}
        data-tip={aria.tip}
        data-tip-side="top"
        onClick={pick}
      >
        <SlashRowBody row={row} />
      </button>
    </div>
  );
};

export { SlashItem };
