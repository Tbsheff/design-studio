import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const TOKENS_ICON_SIZE = 14;

const AppTokensButton = ({
  onTokensOnly,
}: {
  readonly onTokensOnly: () => void;
}): ReactElement => (
  <div className="ui-menu-section">
    <button type="button" className="ui-menu-item" onClick={onTokensOnly}>
      <Icon name="palette" size={TOKENS_ICON_SIZE} />
      <span>{copy.labelUseOnlyItsTokens}</span>
      <span className="ui-menu-meta">{copy.noDevServer}</span>
    </button>
  </div>
);

export { AppTokensButton };
