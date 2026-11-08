import { shareUrl } from "@design-studio/contracts/share";
import type { ShareServerState } from "@design-studio/contracts/share";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ShareLanPrompt } from "./share-lan-prompt.js";
import { ShareQrCode } from "./share-qr-code.js";
import { ShareUrlRow } from "./share-url-row.js";

interface ShareLinkUrlsProps {
  readonly token: string;
  readonly server: ShareServerState;
  readonly isBusy: boolean;
  readonly onLan: (isOn: boolean) => void;
}

const ShareLinkUrls = ({
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
      {lan && <ShareUrlRow kind={copy.localNetwork} url={lan} />}
      {lan && <ShareQrCode url={lan} />}
      {!lan && <ShareLanPrompt isBusy={isBusy} onLan={onLan} />}
    </div>
  );
};

export { ShareLinkUrls };
