import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { CommentPrefill } from '../shared/contracts';
import type { PendingAttachment } from './components/ComposerParts';
import type { DraftStore } from './storage';

export type PrefillRequest = CommentPrefill & { seq: number };

interface Options {
  request: PrefillRequest | null | undefined;
  draft: DraftStore;
  setFiles: Dispatch<SetStateAction<PendingAttachment[]>>;
  maxImages: number;
  focus: () => void;
}

function filesOf(prefill: CommentPrefill): PendingAttachment[] {
  return prefill.attachments.map((item) => ({
    localId: `comment-${item.id}`,
    name: item.name,
    previewUrl: item.dataUrl,
    attachment: { id: item.id, name: item.name, mime: 'image/png', path: '' },
    error: null,
  }));
}

export function useCommentPrefill({ request, draft, setFiles, maxImages, focus }: Options) {
  const [linked, setLinked] = useState<string[]>([]);
  const seen = useRef<number | null>(null);
  const focusRef = useRef(focus);
  focusRef.current = focus;

  useEffect(() => {
    if (!request || seen.current === request.seq) return;
    seen.current = request.seq;
    const current = draft.get().trim();
    draft.set(current ? `${current}\n\n${request.text}` : request.text);
    const incoming = filesOf(request);
    setFiles((prev) => {
      const fresh = incoming.filter((file) => !prev.some((p) => p.localId === file.localId));
      return [...prev, ...fresh].slice(0, maxImages);
    });
    setLinked((prev) => [...new Set([...prev, ...request.commentIds])]);
    focusRef.current();
  }, [request, draft, setFiles, maxImages]);

  return { linked, clear: () => setLinked([]) };
}
