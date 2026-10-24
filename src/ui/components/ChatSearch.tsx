import { Icon } from './Icon';

interface Props {
  open: boolean;
  query: string;
  shown: number;
  total: number;
  onOpen: () => void;
  onClose: () => void;
  onQuery: (query: string) => void;
}

export function ChatSearch({ open, query, shown, total, onOpen, onClose, onQuery }: Props) {
  if (!open) {
    return (
      <div className="chat-search closed">
        <button type="button" className="icon-btn small chat-search-toggle" aria-label="Search runs" data-tip="Search runs" data-tip-align="end" onClick={onOpen}>
          <Icon name="search" size={14} />
        </button>
      </div>
    );
  }
  return (
    <div className="chat-search" role="search">
      <Icon name="search" size={14} className="chat-search-icon" />
      <input
        autoFocus
        type="search"
        className="chat-search-input"
        aria-label="Search runs"
        placeholder="Search runs by prompt or name"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
      />
      {query.trim() !== '' && (
        <span className="chat-search-count tabular-nums" aria-live="polite" data-testid="chat-search-count">
          {shown} of {total}
        </span>
      )}
      <button type="button" className="icon-btn small" aria-label="Close search" data-tip="Close (Esc)" data-tip-align="end" onClick={onClose}>
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
