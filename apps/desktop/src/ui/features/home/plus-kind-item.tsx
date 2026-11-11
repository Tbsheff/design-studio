import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { toNextKind } from "./composer-pop-model.js";
import { copy } from "./copy.js";
import type { PlusMenuActions } from "./plus-menu-model.js";

const ITEM_ICON_SIZE = 14;

const PlusKindItem = ({
  actions,
}: {
  readonly actions: Pick<PlusMenuActions, "kind" | "onKind">;
}): ReactElement | null => {
  const { kind, onKind } = actions;

  const toggle = useCallback((): void => {
    if (kind !== null) {
      onKind(toNextKind(kind));
    }
  }, [kind, onKind]);

  if (kind === null) {
    return null;
  }

  return (
    <button
      type="button"
      role="menuitemcheckbox"
      className="ui-menu-item"
      aria-checked={kind === "react"}
      tabIndex={-1}
      onClick={toggle}
    >
      <Icon name="code" size={ITEM_ICON_SIZE} />
      <span className="truncate">{copy.reactViteProject}</span>
    </button>
  );
};

export { PlusKindItem };
