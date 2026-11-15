import { CopyButton } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface ShareFrameLinkButtonProps {
  readonly name: string;
  readonly position: number;
  readonly url: string;
}

const ShareFrameLinkButton = ({
  name,
  position,
  url,
}: ShareFrameLinkButtonProps): ReactElement => (
  <li className="share-url share-frame-link" data-testid="share-frame-link">
    <span className="share-url-kind">{position}</span>
    <span className="truncate">{name}</span>
    <CopyButton text={url} label={copy.copyLinkToThisFrame} />
  </li>
);

export { ShareFrameLinkButton };
