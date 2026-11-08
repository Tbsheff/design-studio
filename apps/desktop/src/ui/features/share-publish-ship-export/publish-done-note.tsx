import { CopyButton } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { Publication } from "../../../shared/publish.js";
import { STATUS_ROLE } from "./aria-roles.js";
import { copy } from "./copy.js";

interface PublishDoneNoteProps {
  readonly done: Publication;
}

const toUploadText = (done: Publication): string => {
  if (!done.lastUpload) {
    return "";
  }

  return `${copy.uploaded} ${done.lastUpload.sent}, ${copy.reused} ${done.lastUpload.reused}.`;
};

const PublishDoneNote = ({
  done,
}: PublishDoneNoteProps): ReactElement | null => {
  if (done.status !== "live" || !done.url) {
    return null;
  }

  const upload = toUploadText(done);

  return (
    <div
      className="share-url publish-done"
      role={STATUS_ROLE}
      data-testid="publish-done"
    >
      <span className="share-url-kind">{copy.published}</span>
      <code className="mono truncate">{done.url}</code>
      <CopyButton text={done.url} label={copy.copyLinkLabel} />
      {upload && <span className="publish-done-upload">{upload}</span>}
    </div>
  );
};

export { PublishDoneNote };
