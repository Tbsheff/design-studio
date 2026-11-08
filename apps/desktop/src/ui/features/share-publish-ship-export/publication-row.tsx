import { useState } from "react";
import type { ReactElement } from "react";

import type { Publication } from "../../../shared/publish.js";
import { pick } from "./pick.js";
import { PublicationComments } from "./publication-comments.js";
import { toStatusText, toViewsTip } from "./publication-model.js";
import { PublicationRowActions } from "./publication-row-actions.js";
import { PublicationTitle } from "./publication-title.js";
import { PublicationUrl } from "./publication-url.js";
import { PublicationVersions } from "./publication-versions.js";

interface RowProps {
  publication: Publication;
  now: number;
  projectId: string;
  busy: boolean;
  onRepublish: (publication: Publication) => void;
  onUnpublish: (publication: Publication) => void;
  onRollback: (publication: Publication, versionId: string) => void;
  onChanged: () => void;
}

const PublicationRow = ({
  busy,
  now,
  onChanged,
  onRepublish,
  onRollback,
  onUnpublish,
  projectId,
  publication,
}: RowProps): ReactElement => {
  const [openName, setOpenName] = useState<string | null>(null);
  const isActive = publication.status !== "removed";

  return (
    <li
      className={`share-link${pick(publication.status === "live", "", " off")}`}
      data-testid="publication"
      data-publication-id={publication.id}
      data-status={publication.status}
    >
      <div className="share-link-head">
        <PublicationTitle publication={publication} />
        {isActive && (
          <PublicationRowActions
            isBusy={busy}
            openName={openName}
            publication={publication}
            onOpen={setOpenName}
            onRepublish={onRepublish}
            onUnpublish={onUnpublish}
          />
        )}
      </div>
      <span
        className="share-link-meta publish-row-meta truncate"
        data-tip={toViewsTip(publication)}
      >
        {toStatusText(publication, now)}
      </span>
      {publication.url && publication.status === "live" && (
        <PublicationUrl
          updatedAt={publication.updatedAt}
          url={publication.url}
        />
      )}
      {openName === "versions" && (
        <PublicationVersions
          isBusy={busy}
          publication={publication}
          onRollback={onRollback}
        />
      )}
      {openName === "comments" && (
        <PublicationComments
          projectId={projectId}
          publication={publication}
          onChanged={onChanged}
        />
      )}
      {publication.error && (
        <p className="publish-error">{publication.error}</p>
      )}
    </li>
  );
};

export { PublicationRow };

export type { RowProps };
