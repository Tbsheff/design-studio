import { useEffect, useRef, useState } from "react";
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

const useCommentPrefill = ({
  request,
  draft,
  setFiles,
  maxImages,
  focus,
}: Options) => {
  const [linked, setLinked] = useState<string[]>([]);
  const seen = useRef<number | null>(null);
  const focusRef = useRef(focus);
  focusRef.current = focus;

  useEffect(() => {
    if (!request || seen.current === request.seq) {
      return;
    }

    seen.current = request.seq;
    const current = draft.get().trim();
    draft.set((current && `${current}\n\n${request.text}`) || request.text);
    const incoming = filesOf(request);
    setFiles((prev) => {
      const fresh = incoming.filter(
        (file) =>
          !prev.some(
            (pendingAttachment) => pendingAttachment.localId === file.localId
          )
      );

      return [...prev, ...fresh].slice(0, maxImages);
    });
    setLinked((prev) => [...new Set([...prev, ...request.commentIds])]);
    focusRef.current();
  }, [request, draft, setFiles, maxImages]);

  return { clear: (): void => setLinked([]), linked };
};

export { useCommentPrefill };

export type { PrefillRequest };
