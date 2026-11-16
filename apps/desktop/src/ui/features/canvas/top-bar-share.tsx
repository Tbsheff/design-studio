import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import type { Props } from "./top-bar-props.js";

const TopBarShare = ({ props }: { props: Props }): ReactElement | null => {
  const { canExport, onShareLink } = props;

  const openLink = useCallback((): void => {
    onShareLink?.("link");
  }, [onShareLink]);

  if (!onShareLink) {
    return null;
  }

  return (
    <span className="topbar-anchor">
      <button
        type="button"
        className="topbar-share"
        aria-label={copy.share}
        disabled={!canExport}
        data-tip={pick(canExport, copy.shareTip, copy.shareNeedsVersion)}
        data-tip-align="end"
        onClick={openLink}
      >
        <span className="topbar-label">{copy.share}</span>
      </button>
    </span>
  );
};

export { TopBarShare };
