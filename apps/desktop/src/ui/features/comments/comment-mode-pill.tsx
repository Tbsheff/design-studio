import type { ReactElement } from "react";

import { ChatPickBar } from "./chat-pick-bar.js";
import { useJustAdded } from "./comment-added-store.js";
import { copy } from "./copy.js";
import type { DesignComment } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";

const toPillText = (repin: DesignComment | null): string => {
  if (repin) {
    return `Click an element to move comment #${repin.n}`;
  }

  return "Click to comment, Shift-click pins to select, P to draw";
};

const toRepin = (control: CommentsControl | null): DesignComment | null => {
  if (!control?.repinId) {
    return null;
  }

  return control.comments.find((item) => item.id === control.repinId) ?? null;
};

const CommentModePill = ({
  control,
  mode,
}: {
  control: CommentsControl | undefined;
  mode: { on: boolean; available: boolean };
}): ReactElement | null => {
  const added = useJustAdded();

  if (added && mode.available) {
    return (
      <output className="comment-mode-pill" data-testid="comment-added">
        {copy.textCommentAdded}
      </output>
    );
  }

  if (!mode.on || !mode.available) {
    return null;
  }

  return (
    <>
      <output className="comment-mode-pill" data-testid="comment-mode-pill">
        {toPillText(toRepin(control ?? null))}
      </output>
      {control && <ChatPickBar control={control} tone="floating" />}
    </>
  );
};

export { CommentModePill };
