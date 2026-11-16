import type { ShareLink } from "@design-studio/contracts/share";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import { linkMeta } from "./share-text.js";

interface ShareLinkHeadProps {
  readonly link: ShareLink;
  readonly now: number;
  readonly isBusy: boolean;
  readonly onRevoke: (id: string) => void;
}

const ShareLinkHead = ({
  isBusy,
  link,
  now,
  onRevoke,
}: ShareLinkHeadProps): ReactElement => {
  const revokeLink = useCallback((): void => {
    onRevoke(link.id);
  }, [link.id, onRevoke]);

  return (
    <div className="share-link-head">
      <span
        className="share-link-title"
        data-tip={link.title}
        data-tip-align="start"
      >
        <span className="truncate">{link.title}</span>
      </span>
      <span className="share-link-meta truncate">{linkMeta(link, now)}</span>
      {link.active && (
        <button
          type="button"
          className="btn ghost small danger"
          disabled={isBusy}
          onClick={revokeLink}
          data-tip={pick(link.live, copy.revokeLiveTip, copy.revokeTip)}
        >
          {copy.revoke}
        </button>
      )}
    </div>
  );
};

export { ShareLinkHead };
