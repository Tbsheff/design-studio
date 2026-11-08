import type { StyleValueRow } from "@design-studio/contracts/style-search";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { copy } from "./copy.js";
import { MatchMenuItem } from "./match-menu-item.js";
import type { RowActions } from "./match-rows-model.js";

const MatchClassItem = ({
  row,
  cls,
  actions,
  onDone,
}: {
  readonly row: StyleValueRow;
  readonly cls: string;
  readonly actions: RowActions;
  readonly onDone: () => void;
}): ReactElement => {
  const run = useCallback(() => {
    onDone();
    actions.selectClass(row, cls);
  }, [onDone, actions, row, cls]);

  return (
    <MatchMenuItem icon="code" itemRef={null} onRun={run}>
      <span className="sm-menu-class">
        {copy.selectAllWith}
        <code>{cls}</code>
      </span>
    </MatchMenuItem>
  );
};

export { MatchClassItem };
