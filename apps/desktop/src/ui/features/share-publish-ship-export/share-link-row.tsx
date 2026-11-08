import type {
  ShareLink,
  ShareServerState,
} from "@design-studio/contracts/share";
import type { ReactElement } from "react";

import { STATUS_ROLE } from "./aria-roles.js";
import { copy } from "./copy.js";
import { pick } from "./pick.js";
import { ShareCursorSwitch } from "./share-cursor-switch.js";
import { ShareLinkHead } from "./share-link-head.js";
import { ShareLinkUrls } from "./share-link-urls.js";
import { sessionTokens } from "./share-tokens.js";

interface ShareLinkRowProps {
  readonly link: ShareLink;
  readonly server: ShareServerState;
  readonly now: number;
  readonly isBusy: boolean;
  readonly copied: string | null;
  readonly onRevoke: (id: string) => void;
  readonly onCursor: (id: string, isOn: boolean) => void;
  readonly onLan: (isOn: boolean) => void;
}

const ShareLinkRow = ({
  copied,
  isBusy,
  link,
  now,
  onCursor,
  onLan,
  onRevoke,
  server,
}: ShareLinkRowProps): ReactElement => {
  const token = sessionTokens.get(link.id);

  return (
    <li
      className={`share-link${pick(link.active, "", " off")}`}
      data-testid="share-link"
      data-link-id={link.id}
    >
      <ShareLinkHead
        link={link}
        now={now}
        isBusy={isBusy}
        onRevoke={onRevoke}
      />
      {link.active && token && (
        <ShareLinkUrls
          token={token}
          server={server}
          isBusy={isBusy}
          onLan={onLan}
        />
      )}
      {copied === link.id && (
        <p className="share-link-note" role={STATUS_ROLE}>
          {copy.linkCopiedPasteIt}
        </p>
      )}
      {link.active && link.live && (
        <ShareCursorSwitch link={link} isBusy={isBusy} onCursor={onCursor} />
      )}
    </li>
  );
};

export { ShareLinkRow };
