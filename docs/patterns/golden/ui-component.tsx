import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PublicationRow } from "./publication-row.js";
import { usePublications, useUnpublish } from "./use-publications.js";

interface PublicationListProps {
  readonly projectId: string;
}

const PublicationList = ({ projectId }: PublicationListProps): ReactElement => {
  const state = usePublications(projectId);
  const { pending, run } = useUnpublish();

  const onUnpublish = useCallback(
    (publicationId: string) => {
      run({ projectId, publicationId });
    },
    [projectId, run]
  );

  if (state.status === "loading") {
    return <p className="ui-muted">{copy.loading}</p>;
  }

  if (state.status === "error") {
    return <p className="ui-error">{copy.failed}</p>;
  }

  if (state.value.publications.length === 0) {
    return <p className="ui-muted">{copy.empty}</p>;
  }

  return (
    <ul className="ui-menu">
      {state.value.publications.map((publication) => (
        <PublicationRow
          key={publication.id}
          onUnpublish={onUnpublish}
          pending={pending}
          publication={publication}
        />
      ))}
    </ul>
  );
};

export { PublicationList };
