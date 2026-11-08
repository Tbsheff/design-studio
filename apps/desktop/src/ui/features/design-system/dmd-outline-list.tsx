import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import type { OutlineItem } from "./design-md-outline.js";
import { DmdOutlineItem } from "./dmd-outline-item.js";

const DmdOutlineList = ({
  items,
  onJump,
}: {
  items: OutlineItem[];
  onJump: (item: OutlineItem, index: number) => void;
}): ReactElement => {
  if (items.length === 0) {
    return <p className="dmd-outline-empty">{COPY.textAddAHeadingLike}</p>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <DmdOutlineItem
          key={`${item.line}:${item.text}`}
          index={index}
          item={item}
          onJump={onJump}
        />
      ))}
    </ul>
  );
};

export { DmdOutlineList };
