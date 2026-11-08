import type { QueuedMessage } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { QueuedEdit } from "./queued-edit.js";
import { QueuedGrip } from "./queued-grip.js";
import { editQueued, removeQueued } from "./queued-model.js";
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
    <li
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
      <button
        type="button"
        className="icon-btn small queued-remove"
        aria-label={copy.removeQueuedMessage}
        data-tip={copy.remove}
        data-tip-side="top"
        onClick={onRemove}
      >
        <Icon name="close" size={14} />
      </button>
    </li>
  );
};

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
    <div className="queued" aria-label={copy.queuedMessages} role="group">
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
    </div>
  );
};

export { QueuedMessages };
