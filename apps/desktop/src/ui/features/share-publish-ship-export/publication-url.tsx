import { CopyButton } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toDayText } from "./publication-model.js";

interface Props {
  updatedAt: number;
  url: string;
}

const PublicationUrl = ({ updatedAt, url }: Props): ReactElement => (
  <div className="share-url">
    <span className="share-url-kind">{toDayText(updatedAt)}</span>
    <code className="mono truncate">{url}</code>
    <span className="publish-url-actions">
      <a
        className="btn ghost small"
        href={url}
        target="_blank"
        rel="noreferrer noopener"
      >
        {copy.open}
      </a>
      <CopyButton text={url} label="Copy link" />
    </span>
  </div>
);

export { PublicationUrl };
