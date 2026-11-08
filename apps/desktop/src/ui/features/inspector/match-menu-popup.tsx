import type { StyleValueRow } from "@design-studio/contracts/style-search";
import { isRawClass } from "@design-studio/contracts/style-search";
import type { ReactElement, RefObject } from "react";

import { copy } from "./copy.js";
import { toShownValue } from "./match-candidates-model.js";
import { MatchClassItem } from "./match-class-item.js";
import { MatchMenuItem } from "./match-menu-item.js";
import type { RowActions } from "./match-rows-model.js";

const MAX_CLASSES = 2;

const toMenuClasses = (row: StyleValueRow): string[] => [
  ...row.classes.filter(isRawClass).slice(0, MAX_CLASSES),
  ...row.classes.filter((cls) => !isRawClass(cls)).slice(0, MAX_CLASSES),
];

const MatchMenuPopup = ({
  row,
  actions,
  replaceLabel,
  firstItemRef,
  onSelectValue,
  onReplace,
  onDone,
}: {
  readonly row: StyleValueRow;
  readonly actions: RowActions;
  readonly replaceLabel: string;
  readonly firstItemRef: RefObject<HTMLButtonElement | null>;
  readonly onSelectValue: () => void;
  readonly onReplace: () => void;
  readonly onDone: () => void;
}): ReactElement => (
  <div
    className="ui-menu sm-menu"
    role="menu"
    aria-label={`${toShownValue(row)} actions`}
  >
    <MatchMenuItem icon="pointer" itemRef={firstItemRef} onRun={onSelectValue}>
      <span>{copy.selectAllWithThisValue}</span>
    </MatchMenuItem>
    {toMenuClasses(row).map((cls) => (
      <MatchClassItem
        key={cls}
        row={row}
        cls={cls}
        actions={actions}
        onDone={onDone}
      />
    ))}
    <MatchMenuItem icon="token" itemRef={null} onRun={onReplace}>
      <span>{replaceLabel}</span>
    </MatchMenuItem>
  </div>
);

export { MatchMenuPopup };
