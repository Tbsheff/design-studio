import type { ReactElement } from "react";

import type { Publication } from "../../../shared/publish.js";
import { copy } from "./copy.js";
import { PublicationCommentItem } from "./publication-comment-item.js";
import { usePublicationComments } from "./use-publication-comments.js";

interface Props {
  projectId: string;
  publication: Publication;
  onChanged: () => void;
}

const PublicationComments = ({
  onChanged,
  projectId,
  publication,
}: Props): ReactElement => {
  const { error, list, remove } = usePublicationComments(
    projectId,
    publication.id,
    onChanged
  );

  return (
    <div className="publish-comments" data-testid="publish-comments">
      {error && <p className="publish-error">{error}</p>}
      {list?.length === 0 && (
        <p className="publish-step-text">{copy.noViewerCommentsYet}</p>
      )}
      <ol>
        {list?.map((comment) => (
          <PublicationCommentItem
            key={comment.id}
            comment={comment}
            onRemove={remove}
          />
        ))}
      </ol>
    </div>
  );
};

export { PublicationComments };
