import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { Icon } from "./deps.js";

const ComposerComments = ({
  count,
  onClear,
}: {
  count: number;
  onClear: () => void;
}): ReactElement | null => {
  if (count === 0) {
    return null;
  }

  const noun = (count === 1 && "comment") || "comments";

  const iconNode = <Icon name="close" size={12} />;

  return (
    <div className="composer-comments" data-testid="composer-comments">
      <span
        className="chip"
        data-tip={`The run gets each ${noun.replace(/s$/u, "")} with its element, and the run summary offers to resolve them.`}
        data-tip-side="top"
      >
        <Icon name="comment" size={12} />
        {count} {noun} {copy.textLinked}
        <button
          type="button"
          className="icon-btn small"
          aria-label={`Unlink the ${noun}`}
          onClick={onClear}
        >
          {iconNode}
        </button>
      </span>
    </div>
  );
};

export { ComposerComments };
