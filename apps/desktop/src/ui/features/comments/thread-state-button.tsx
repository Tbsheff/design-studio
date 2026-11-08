import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { DesignComment } from "./deps.js";
import { ThreadIconButton } from "./thread-icon-button.js";

const ThreadStateButton = ({
  comment,
  onReopen,
  onResolve,
}: {
  comment: DesignComment;
  onReopen: () => void;
  onResolve: () => void;
}): ReactElement | null => {
  if (comment.status === "resolved") {
    return (
      <ThreadIconButton
        icon="undo"
        isDanger={false}
        label={copy.reopen}
        onClick={onReopen}
        size={14}
        tip={copy.reopen}
      />
    );
  }

  if (comment.status === "sent") {
    return null;
  }

  return (
    <ThreadIconButton
      icon="check"
      isDanger={false}
      label={copy.resolve}
      onClick={onResolve}
      size={14}
      tip={copy.resolve}
    />
  );
};

export { ThreadStateButton };
