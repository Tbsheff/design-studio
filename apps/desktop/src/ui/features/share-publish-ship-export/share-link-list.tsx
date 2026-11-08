import type {
  ShareLink,
  ShareServerState,
} from "@design-studio/contracts/share";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ShareLinkRow } from "./share-link-row.js";
import { toLinkNotes } from "./share-notes.js";

interface ShareLinkListProps {
  readonly links: readonly ShareLink[];
  readonly server: ShareServerState;
  readonly now: number;
  readonly isBusy: boolean;
  readonly copied: string | null;
  readonly onRevoke: (id: string) => void;
  readonly onCursor: (id: string, isOn: boolean) => void;
  readonly onLan: (isOn: boolean) => void;
}

const ShareLinkList = ({
  copied,
  isBusy,
  links,
  now,
  onCursor,
  onLan,
  onRevoke,
  server,
}: ShareLinkListProps): ReactElement | null => {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="share-links-group">
      <ul className="share-links" aria-label={copy.shareLinks}>
        {links.map((link) => (
          <ShareLinkRow
            key={link.id}
            link={link}
            server={server}
            now={now}
            isBusy={isBusy}
            copied={copied}
            onRevoke={onRevoke}
            onCursor={onCursor}
            onLan={onLan}
          />
        ))}
      </ul>
      {toLinkNotes(links, server).map((note) => (
        <p key={note} className="share-link-note">
          {note}
        </p>
      ))}
    </div>
  );
};

export { ShareLinkList };
