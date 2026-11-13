import type {
  ShareCommentDraft,
  ShareViewerComment,
} from "@design-studio/contracts/share-play";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  createShareComment,
  listShareComments,
} from "../../platform/share-play.js";

interface ShareComments {
  readonly comments: readonly ShareViewerComment[];
  readonly error: string | null;
  readonly isPending: boolean;
  readonly send: (draft: ShareCommentDraft, onSent: () => void) => void;
}

const useShareComments = (): ShareComments => {
  const [comments, setComments] = useState<readonly ShareViewerComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isCurrent = true;

    const load = async (): Promise<void> => {
      const list = await listShareComments();

      if (isCurrent) {
        setComments(list);
      }
    };

    void load();

    return (): void => {
      isCurrent = false;
    };
  }, []);

  const send = useCallback(
    (draft: ShareCommentDraft, onSent: () => void): void => {
      startTransition(async () => {
        const reply = await createShareComment(draft);
        const made = reply.comment;

        setError(reply.error);

        if (made !== null) {
          setComments((list) => [...list, made]);
          onSent();
        }
      });
    },
    []
  );

  return { comments, error, isPending, send };
};

export { useShareComments };

export type { ShareComments };
