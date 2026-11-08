import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { copy } from "./copy.js";
import { writeShadows } from "./effects-model.js";
import type { ShadowView } from "./effects-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import {
  toInsetTip,
  toInsetToggled,
  toShadowRemoved,
} from "./use-shadow-row.js";

const ShadowHead = ({
  edit,
  view,
  index,
  isInset,
}: {
  readonly edit: DirectEdit;
  readonly view: ShadowView;
  readonly index: number;
  readonly isInset: boolean;
}): ReactElement => {
  const count = index + 1;

  const toggleInset = useCallback(
    () => writeShadows(edit, view, (own) => toInsetToggled(own, index)),
    [edit, view, index]
  );

  const removeShadow = useCallback(
    () => writeShadows(edit, view, (own) => toShadowRemoved(own, index)),
    [edit, view, index]
  );

  return (
    <div className="ins-shadow-head">
      <span className="ins-shadow-name">
        {copy.shadow}
        {count}
      </span>
      <button
        type="button"
        className="ins-chip-toggle"
        aria-pressed={isInset}
        aria-label={`Shadow ${count} inset`}
        data-tip={toInsetTip(isInset)}
        onClick={toggleInset}
      >
        {copy.inset}
      </button>
      <button
        type="button"
        className="icon-btn small"
        aria-label={`Remove shadow ${count}`}
        data-tip={copy.removeShadow}
        data-tip-align="end"
        onClick={removeShadow}
      >
        <Icon name="minus" size={14} />
      </button>
    </div>
  );
};

export { ShadowHead };
