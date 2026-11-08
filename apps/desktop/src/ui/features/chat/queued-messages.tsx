import type { QueuedMessage } from "@design-studio/contracts";
import { useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { QueuedItem } from "./queued-item.js";

const QueuedMessages = ({
  items,
  onChange,
}: {
  items: QueuedMessage[];
  onChange: (items: QueuedMessage[]) => void;
}): ReactElement | null => {
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  if (items.length === 0) {
    return null;
  }

  return (
    <fieldset className="queued" aria-label={copy.queuedMessages}>
      <span className="queued-head">{copy.queuedSentAtThe}</span>
      <ol className="queued-list">
        {items.map((item, index) => (
          <QueuedItem
            key={item.id}
            item={item}
            index={index}
            items={items}
            dragFrom={dragFrom}
            onItems={onChange}
            onDragFrom={setDragFrom}
          />
        ))}
      </ol>
    </fieldset>
  );
};

export { QueuedMessages };
