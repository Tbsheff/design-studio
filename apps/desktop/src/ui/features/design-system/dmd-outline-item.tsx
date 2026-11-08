import type { ReactElement } from "react";
import { useCallback } from "react";

import type { OutlineItem } from "./design-md-outline.js";

const DmdOutlineItem = ({
  index,
  item,
  onJump,
}: {
  index: number;
  item: OutlineItem;
  onJump: (item: OutlineItem, index: number) => void;
}): ReactElement => {
  const jump = useCallback(() => onJump(item, index), [index, item, onJump]);

  return (
    <li>
      <button
        type="button"
        className={`dmd-outline-item level-${item.level}`}
        onClick={jump}
      >
        <span className="truncate">{item.text}</span>
      </button>
    </li>
  );
};

export { DmdOutlineItem };
