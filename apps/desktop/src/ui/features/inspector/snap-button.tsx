import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { TokenUi } from "./use-token-snap.js";

const toSnapTip = (isOn: boolean): string => {
  if (isOn) {
    return copy.snapOnTip;
  }

  return copy.snapOffTip;
};

const SnapButton = ({ ui }: { readonly ui: TokenUi }): ReactElement => {
  const toggle = useCallback(() => ui.setSnap(!ui.shouldSnap), [ui]);

  return (
    <button
      type="button"
      className="icon-btn small tk-snap-toggle"
      aria-label={copy.snapToTokens}
      aria-pressed={ui.shouldSnap}
      data-tip={toSnapTip(ui.shouldSnap)}
      data-tip-align="end"
      onClick={toggle}
    >
      <Icon name="magnet" size={14} />
    </button>
  );
};

export { SnapButton };
