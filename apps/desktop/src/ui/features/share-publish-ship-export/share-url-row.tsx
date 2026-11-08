import { CopyButton } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface ShareUrlRowProps {
  readonly kind: string;
  readonly url: string;
}

const ShareUrlRow = ({ kind, url }: ShareUrlRowProps): ReactElement => (
  <div className="share-url">
    <span className="share-url-kind">{kind}</span>
    <code className="mono truncate">{url}</code>
    <CopyButton text={url} label={copy.copyLinkLabel} />
  </div>
);

export { ShareUrlRow };
