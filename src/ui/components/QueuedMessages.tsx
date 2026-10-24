import { useState, type KeyboardEvent } from 'react';
import type { QueuedMessage } from '../../shared/contracts';
import { Icon } from './Icon';

function move(items: QueuedMessage[], from: number, to: number): QueuedMessage[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item) next.splice(to, 0, item);
  return next;
}

function QueuedItem({ item, index, count, onChange, onRemove, onMove, onDragStart, onDropAt }: {
  item: QueuedMessage;
  index: number;
  count: number;
  onChange: (text: string) => void;
  onRemove: () => void;
  onMove: (to: number) => void;
  onDragStart: () => void;
  onDropAt: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const finish = (save: boolean) => {
    setEditing(false);
    if (save && text.trim() && text !== item.text) onChange(text);
    else setText(item.text);
  };
  const onKey = (event: KeyboardEvent<HTMLLIElement>) => {
    if (editing || !event.altKey) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      onMove(index + (event.key === 'ArrowUp' ? -1 : 1));
    }
  };
  return (
    <li
      className="queued-item"
      draggable={!editing && count > 1}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDropAt();
      }}
      onKeyDown={onKey}
      data-testid="queued-item"
    >
      {count > 1 && (
        <span className="queued-grip" aria-hidden="true">
          ⋮⋮
        </span>
      )}
      {editing ? (
        <textarea
          className="queued-edit"
          aria-label="Edit queued message"
          value={text}
          autoFocus
          rows={Math.min(4, text.split('\n').length)}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => finish(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              event.preventDefault();
              finish(false);
            } else if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              finish(true);
            }
          }}
        />
      ) : (
        <button type="button" className="queued-text" title={`Edit. ${count > 1 ? 'Alt+↑ or Alt+↓ moves it.' : ''}`} onClick={() => setEditing(true)}>
          {item.text}
        </button>
      )}
      <button type="button" className="icon-btn small queued-remove" aria-label="Remove queued message" data-tip="Remove" data-tip-side="top" onClick={onRemove}>
        <Icon name="close" size={14} />
      </button>
    </li>
  );
}

export function QueuedMessages({ items, onChange }: { items: QueuedMessage[]; onChange: (items: QueuedMessage[]) => void }) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  if (items.length === 0) return null;
  return (
    <div className="queued" aria-label="Queued messages" role="group">
      <span className="queued-head">Queued · sent at the next step</span>
      <ol className="queued-list">
        {items.map((item, index) => (
          <QueuedItem
            key={item.id}
            item={item}
            index={index}
            count={items.length}
            onChange={(text) => onChange(items.map((entry) => (entry.id === item.id ? { ...entry, text } : entry)))}
            onRemove={() => onChange(items.filter((entry) => entry.id !== item.id))}
            onMove={(to) => onChange(move(items, index, to))}
            onDragStart={() => setDragFrom(index)}
            onDropAt={() => {
              if (dragFrom !== null) onChange(move(items, dragFrom, index));
              setDragFrom(null);
            }}
          />
        ))}
      </ol>
    </div>
  );
}
