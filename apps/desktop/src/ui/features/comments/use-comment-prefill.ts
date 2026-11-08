import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { CommentPrefill, DraftStore, PendingAttachment } from "./deps.js";

type PrefillRequest = CommentPrefill & { seq: number };

interface Options {
  request: PrefillRequest | null | undefined;
  draft: DraftStore;
  setFiles: Dispatch<SetStateAction<PendingAttachment[]>>;
  maxImages: number;
  focus: () => void;
}

const filesOf = (prefill: CommentPrefill): PendingAttachment[] =>
  prefill.attachments.map((item) => ({
    attachment: { id: item.id, mime: "image/png", name: item.name, path: "" },
    error: null,
    localId: `comment-${item.id}`,
    name: item.name,
    previewUrl: item.dataUrl,
  }));

interface CommentPrefillState {
  clear: () => void;
  linked: string[];
}

const toFresh = (
  incoming: PendingAttachment[],
  prev: PendingAttachment[]
): PendingAttachment[] =>
  incoming.filter(
    (file) => !prev.some((pending) => pending.localId === file.localId)
  );

const useCommentPrefill = ({
  request,
  draft,
  setFiles,
  maxImages,
  focus,
}: Options): CommentPrefillState => {
  const [linked, setLinked] = useState<string[]>([]);
  const seen = useRef<number | null>(null);
  const focusRef = useRef(focus);

  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  useEffect(() => {
    if (!request || seen.current === request.seq) {
      return;
    }

    seen.current = request.seq;
    const current = draft.get().trim();
    draft.set((current && `${current}\n\n${request.text}`) || request.text);
    const incoming = filesOf(request);
    setFiles((prev) =>
      [...prev, ...toFresh(incoming, prev)].slice(0, maxImages)
    );
    setLinked((prev) => [...new Set([...prev, ...request.commentIds])]);
    focusRef.current();
  }, [request, draft, setFiles, maxImages]);

  const clear = useCallback((): void => setLinked([]), []);

  return { clear, linked };
};

export { useCommentPrefill };

export type { PrefillRequest };
