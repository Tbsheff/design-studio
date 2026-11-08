import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { REMOVE_ICON_SIZE } from "./auto-layout-model.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { setEdit } from "./use-layout-keys.js";

interface Props {
  readonly edit: DirectEdit;
}

const AutoLayoutRemove = ({ edit }: Props): ReactElement => {
  const handleRemove = useCallback((): void => {
    setEdit(edit, { display: "block" });
  }, [edit]);

  return (
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.removeAutoLayout}
      aria-keyshortcuts="Alt+Shift+A"
      data-tip={copy.removeAutoLayoutA}
      data-tip-align="end"
      onClick={handleRemove}
    >
      <Icon name="close" size={REMOVE_ICON_SIZE} />
    </button>
  );
};

export { AutoLayoutRemove };
