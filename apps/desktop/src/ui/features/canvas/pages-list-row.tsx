import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { MenuEntry } from "./top-bar-menu-model.js";

const PagesListRow = ({
  entry,
}: {
  readonly entry: MenuEntry;
}): ReactElement => {
  const { run } = entry;
  const runEntry = useCallback((): void => run(), [run]);

  return (
    <button
      type="button"
      className="column-row"
      aria-current={entry.checked === true}
      disabled={entry.disabled === true}
      onClick={runEntry}
    >
      {entry.icon && <Icon name={entry.icon} size={14} />}
      <span className="truncate">{entry.label}</span>
      {entry.meta && <span className="column-row-meta">{entry.meta}</span>}
    </button>
  );
};

export { PagesListRow };
