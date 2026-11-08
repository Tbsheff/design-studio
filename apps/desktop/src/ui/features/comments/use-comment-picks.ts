import { useCallback, useMemo, useState } from "react";

import { canPickForChat } from "./deps.js";
import type { DesignComment } from "./deps.js";

interface CommentPicks {
  readonly clearPicked: () => void;
  readonly picked: string[];
  readonly togglePick: (id: string) => void;
}

const isPickable = (comments: DesignComment[], id: string): boolean =>
  comments.some(
    (comment) => comment.id === id && canPickForChat(comment.status)
  );

const toToggled = (prev: string[], id: string): string[] => {
  if (prev.includes(id)) {
    return prev.filter((item) => item !== id);
  }

  return [...prev, id];
};

const usePicks = (comments: DesignComment[]): CommentPicks => {
  const [chosen, setChosen] = useState<string[]>([]);

  const picked = useMemo(
    () => chosen.filter((id) => isPickable(comments, id)),
    [chosen, comments]
  );

  const togglePick = useCallback(
    (id: string): void => setChosen((prev) => toToggled(prev, id)),
    []
  );

  const clearPicked = useCallback((): void => setChosen([]), []);

  return { clearPicked, picked, togglePick };
};

export { usePicks };

export type { CommentPicks };
