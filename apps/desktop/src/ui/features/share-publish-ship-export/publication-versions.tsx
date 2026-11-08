import type { ReactElement } from "react";

import type { Publication } from "../../../shared/publish.js";
import { copy } from "./copy.js";
import { PublicationVersionItem } from "./publication-version-item.js";

interface Props {
  isBusy: boolean;
  publication: Publication;
  onRollback: (publication: Publication, versionId: string) => void;
}

const PublicationVersions = ({
  isBusy,
  onRollback,
  publication,
}: Props): ReactElement => (
  <ol
    className="publish-versions"
    aria-label={copy.versions}
    data-testid="publish-versions"
  >
    {publication.versions.map((version) => (
      <PublicationVersionItem
        key={version.id}
        isBusy={isBusy}
        publication={publication}
        version={version}
        onRollback={onRollback}
      />
    ))}
  </ol>
);

export { PublicationVersions };
