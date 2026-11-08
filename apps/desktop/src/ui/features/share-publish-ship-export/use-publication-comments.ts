import { useCallback, useEffect, useState } from "react";

import type { PublicationComment } from "../../../shared/publish.js";
import { errorText } from "../../api.js";
import { publishApi } from "./publish-api.js";
import { settle } from "./settle.js";

interface PublicationComments {
  error: string | null;
  list: PublicationComment[] | null;
  remove: (commentId: string) => void;
}

const usePublicationComments = (
  projectId: string,
  publicationId: string,
  onChanged: () => void
): PublicationComments => {
  const [list, setList] = useState<PublicationComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    await settle(
      publishApi.comments(projectId, publicationId),
      (result) => setList(result.comments),
      (failure) => setError(errorText(failure))
    );
  }, [projectId, publicationId]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = useCallback(
    (commentId: string): void => {
      const run = async (): Promise<void> => {
        await settle(
          publishApi.deleteComment(projectId, publicationId, commentId),
          () => null,
          (failure) => setError(errorText(failure))
        );

        await load();
        onChanged();
      };

      run();
    },
    [projectId, publicationId, load, onChanged]
  );

  return { error, list, remove };
};

export { usePublicationComments };
