import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toQrCode } from "./qr-model.js";

interface ShareQrCodeProps {
  readonly url: string;
}

const ShareQrCode = ({ url }: ShareQrCodeProps): ReactElement | null => {
  const code = toQrCode(url);

  if (code === null) {
    return null;
  }

  return (
    <figure className="share-qr" data-testid="share-qr">
      <svg className="share-qr-image" viewBox={`0 0 ${code.size} ${code.size}`}>
        <title>{copy.qrCodeLabel}</title>
        <rect width={code.size} height={code.size} className="share-qr-back" />
        <path d={code.path} className="share-qr-dark" />
      </svg>
      <figcaption className="share-qr-caption">
        {copy.scanToOpenOnPhone}
      </figcaption>
    </figure>
  );
};

export { ShareQrCode };
