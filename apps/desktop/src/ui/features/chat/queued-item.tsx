import type { QueuedMessage } from "@design-studio/contracts";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { QueuedEdit } from "./queued-edit.js";
import { QueuedGrip } from "./queued-grip.js";
import { editQueued, removeQueued } from "./queued-model.js";
import { QueuedRemove } from "./queued-remove.js";
import { useQueuedMoves } from "./use-queued-moves.js";

const QueuedItem = ({
  item,
  index,
  items,
  dragFrom,
  onItems,
  onDragFrom,
}: {
  item: QueuedMessage;
  index: number;
  items: QueuedMessage[];
  dragFrom: number | null;
  onItems: (items: QueuedMessage[]) => void;
  onDragFrom: (from: number | null) => void;
}): ReactElement => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const count = items.length;

  const onFinish = useCallback(
    (save: boolean): void => {
      setIsEditing(false);

      if (save && text.trim() && text !== item.text) {
        onItems(editQueued(items, item.id, text));
      } else {
        setText(item.text);
      }
    },
    [text, item, items, onItems]
  );

  const { onDragOver, onDragStart, onDrop, onKeyDown } = useQueuedMoves({
    dragFrom,
    index,
    isEditing,
    items,
    onDragFrom,
    onItems,
  });

  const onEdit = useCallback(() => setIsEditing(true), []);

  const onRemove = useCallback(
    () => onItems(removeQueued(items, item.id)),
    [items, item.id, onItems]
  );

  return (
    <li className="queued-row">
      <div
        role="presentation"
        className="queued-item"
        draggable={!isEditing && count > 1}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onKeyDown={onKeyDown}
        data-testid="queued-item"
      >
        {count > 1 && <QueuedGrip />}
        {isEditing && (
          <QueuedEdit text={text} onText={setText} onFinish={onFinish} />
        )}
        {!isEditing && (
          <button type="button" className="queued-text" onClick={onEdit}>
            {item.text}
          </button>
        )}
        <QueuedRemove onRemove={onRemove} />
      </div>
    </li>
  );
};

export { QueuedItem };
