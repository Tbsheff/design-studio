import type { ReactElement } from "react";

import type { Publication } from "../../../shared/publish.js";
import { copy } from "./copy.js";
import { isReadOnlyPublication } from "./publish-api.js";

interface Props {
  publication: Publication;
}

const PublicationTitle = ({ publication }: Props): ReactElement => {
  const isReadOnly = isReadOnlyPublication(publication);

  return (
    <span className="share-link-title">
      <span className="truncate">{publication.title}</span>
      {isReadOnly && (
        <span className="publish-legacy-tag" data-tip={copy.legacyTip}>
          {copy.legacy}
        </span>
      )}
      {!isReadOnly && publication.backend !== "app" && (
        <span className="publish-legacy-tag" data-tip={copy.workerTip}>
          {copy.oldWorker}
        </span>
      )}
    </span>
  );
};

export { PublicationTitle };
