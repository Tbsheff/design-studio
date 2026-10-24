import { useEffect, useMemo, useState } from 'react';
import type { RunMention } from '../../shared/contracts';
import { fuzzyRank } from '../../shared/fuzzy';
import { Icon } from './Icon';

export interface MentionOption {
  key: string;
  label: string;
  detail: string;
  mention: RunMention;
}

export function mentionKey(mention: RunMention): string {
  return mention.kind === 'file' ? `file:${mention.path}` : `token:${mention.name}`;
}

export function mentionLabel(mention: RunMention): string {
  return mention.kind === 'file' ? (mention.path.split('/').pop() ?? mention.path) : mention.name;
}

export function mentionQueryOf(draft: string): string | null {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(draft);
  return match ? (match[1] ?? '') : null;
}

export function rankMentions(options: readonly MentionOption[], query: string): MentionOption[] {
  return fuzzyRank(options, query, (option) => (option.mention.kind === 'file' ? option.mention.path : option.label), 30);
}

export function useMentionPicker(options: readonly MentionOption[], query: string | null) {
  const [active, setActive] = useState(0);
  const shown = useMemo(() => (query === null ? [] : rankMentions(options, query)), [options, query]);
  useEffect(() => setActive(0), [query]);
  const current = shown[Math.min(active, Math.max(0, shown.length - 1))] ?? null;
  const move = (step: 1 | -1) => setActive((index) => (shown.length === 0 ? 0 : (index + step + shown.length) % shown.length));
  return { open: query !== null, shown, current, move, setActive };
}

export function MentionList({ shown, current, loading, onPick, onHover }: { shown: MentionOption[]; current: MentionOption | null; loading: boolean; onPick: (option: MentionOption) => void; onHover: (index: number) => void }) {
  useEffect(() => {
    if (current) document.getElementById(`mention-${current.key}`)?.scrollIntoView({ block: 'nearest' });
  }, [current]);
  return (
    <div className="skill-pop mention-pop" data-testid="mention-list">
      <ul role="listbox" aria-label="Mention a file or token" className="skill-opts" id="mention-options">
        {shown.map((option, index) => (
          <li
            key={option.key}
            id={`mention-${option.key}`}
            role="option"
            aria-selected={option === current}
            className={`skill-opt mention-opt ${option === current ? 'active' : ''}`}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHover(index)}
            onClick={() => onPick(option)}
          >
            <span className="skill-opt-head">
              <Icon name={option.mention.kind === 'file' ? 'file' : 'token'} size={13} />
              <strong className="mention-label">{option.label}</strong>
              <span className="skill-origin mention-detail">{option.detail}</span>
            </span>
          </li>
        ))}
        {shown.length === 0 && <li className="skill-empty">{loading ? 'Loading files…' : 'Nothing matches.'}</li>}
      </ul>
      <p className="skill-pop-foot">↑ ↓ to move, Enter or Tab to add, Esc to close</p>
    </div>
  );
}

export function MentionChips({ mentions, onRemove }: { mentions: RunMention[]; onRemove: (key: string) => void }) {
  if (mentions.length === 0) return null;
  return (
    <div className="skill-chips" aria-label="Mentions for this message">
      {mentions.map((mention) => {
        const key = mentionKey(mention);
        return (
          <span key={key} className="skill-chip mention-chip" title={mention.kind === 'file' ? mention.path : `${mention.name}: ${mention.value}`} data-testid="mention-chip">
            <Icon name={mention.kind === 'file' ? 'file' : 'token'} size={12} />
            {mentionLabel(mention)}
            <button type="button" aria-label={`Remove ${mentionLabel(mention)}`} onClick={() => onRemove(key)}>
              <Icon name="close" size={11} />
            </button>
          </span>
        );
      })}
    </div>
  );
}
