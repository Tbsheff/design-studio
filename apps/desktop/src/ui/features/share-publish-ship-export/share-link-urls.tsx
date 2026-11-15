import {
  shareUrl,
  toShareFrameKey,
  toShareFrameUrl,
} from "@design-studio/contracts/share";
import type {
  ShareFrame,
  ShareServerState,
} from "@design-studio/contracts/share";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ShareFrameLinkButton } from "./share-frame-link-button.js";
import { ShareLanPrompt } from "./share-lan-prompt.js";
import { ShareQrCode } from "./share-qr-code.js";
import { ShareUrlRow } from "./share-url-row.js";

interface ShareLinkUrlsProps {
  readonly token: string;
  readonly frames: readonly ShareFrame[];
  readonly server: ShareServerState;
  readonly isBusy: boolean;
  readonly onLan: (isOn: boolean) => void;
}

const MIN_FRAME_LINKS = 2;

const toFrameLinkRows = (
  base: string,
  frames: readonly ShareFrame[],
  token: string
): ReactElement[] =>
  frames.map((frame, index) => {
    const key = toShareFrameKey(frame, index);

    return (
      <ShareFrameLinkButton
        key={key}
        name={frame.name}
        position={index + 1}
        url={toShareFrameUrl(base, token, key)}
      />
    );
  });

const ShareLinkUrls = ({
  frames,
  isBusy,
  onLan,
  server,
  token,
}: ShareLinkUrlsProps): ReactElement => {
  const local = server.localUrl && shareUrl(server.localUrl, token);
  const lan = server.lanUrl && shareUrl(server.lanUrl, token);

  return (
    <div className="share-urls">
      {local && <ShareUrlRow kind={copy.thisComputer} url={local} />}
      {server.localUrl && frames.length >= MIN_FRAME_LINKS && (
        <ul className="share-frame-links" aria-label={copy.frameLinks}>
          {toFrameLinkRows(server.localUrl, frames, token)}
        </ul>
      )}
      {lan && <ShareUrlRow kind={copy.localNetwork} url={lan} />}
      {lan && <ShareQrCode url={lan} />}
      {!lan && <ShareLanPrompt isBusy={isBusy} onLan={onLan} />}
    </div>
  );
};

export { ShareLinkUrls };
