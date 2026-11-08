import { useCallback } from "react";
import type { ReactElement } from "react";

import type { Publication } from "../../../shared/publish.js";
import { copy } from "./copy.js";
import { PublicationRow } from "./publication-row.js";
import { toRepublishInput } from "./publish-request.js";
import type { PublishTarget } from "./publish-types.js";
import type { PublishFlow } from "./use-publish-flow.js";

interface PublishPublicationListProps {
  readonly target: PublishTarget;
  readonly flow: PublishFlow;
  readonly list: readonly Publication[];
  readonly now: number;
}

const PublishPublicationList = ({
  flow,
  list,
  now,
  target,
}: PublishPublicationListProps): ReactElement => {
  const { check, pubs, rollback, unpublish } = flow;
  const { reload } = pubs;

  const republish = useCallback(
    (publication: Publication): void => {
      check(toRepublishInput(target, publication.id));
    },
    [check, target]
  );

  const changed = useCallback((): void => {
    void reload();
  }, [reload]);

  return (
    <ul className="share-links" aria-label={copy.publications}>
      {list.map((publication) => (
        <PublicationRow
          key={publication.id}
          publication={publication}
          now={now}
          projectId={target.projectId}
          busy={flow.busy !== null}
          onRepublish={republish}
          onUnpublish={unpublish}
          onRollback={rollback}
          onChanged={changed}
        />
      ))}
    </ul>
  );
};

export { PublishPublicationList };
