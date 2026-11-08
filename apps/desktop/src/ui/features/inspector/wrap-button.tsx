import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { ICON_SIZE, toWrapPatch, toWrapTip } from "./auto-layout-model.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { setEdit } from "./use-layout-keys.js";

interface Props {
  readonly edit: DirectEdit;
  readonly wraps: boolean;
}

const WrapButton = ({ edit, wraps }: Props): ReactElement => {
  const handleWrap = useCallback((): void => {
    setEdit(edit, toWrapPatch(wraps));
  }, [edit, wraps]);

  return (
    <button
      type="button"
      className="icon-btn ins-toggle"
      aria-label={copy.wrap}
      aria-pressed={wraps}
      data-tip={toWrapTip(wraps)}
      onClick={handleWrap}
    >
      <Icon name="wrap" size={ICON_SIZE} />
    </button>
  );
};

export { WrapButton };
