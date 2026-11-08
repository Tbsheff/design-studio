import type { RunMention } from "@design-studio/contracts";
import { useCallback, useState } from "react";

import { toMentionsWith } from "./mention-options-model.js";
import { mentionKey } from "./mention-picker.js";

interface MentionRequest {
  mention: RunMention;
  seq: number;
}

interface MentionSet {
  readonly add: (mention: RunMention) => void;
  readonly clear: () => void;
  readonly mentions: RunMention[];
  readonly remove: (key: string) => void;
}

const useMentionSet = (
  request: MentionRequest | null | undefined
): MentionSet => {
  const [mentions, setMentions] = useState<RunMention[]>([]);
  const [seenSeq, setSeenSeq] = useState<number | null>(null);

  if (request && request.seq !== seenSeq) {
    setSeenSeq(request.seq);
    setMentions((prev) => [...toMentionsWith(prev, request.mention)]);
  }

  const add = useCallback(
    (mention: RunMention): void =>
      setMentions((prev) => [...toMentionsWith(prev, mention)]),
    []
  );

  const clear = useCallback((): void => setMentions([]), []);

  const remove = useCallback(
    (key: string): void =>
      setMentions((prev) =>
        prev.filter((mention) => mentionKey(mention) !== key)
      ),
    []
  );

  return { add, clear, mentions, remove };
};

export { useMentionSet };

export type { MentionRequest, MentionSet };
