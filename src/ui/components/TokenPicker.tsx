import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import type { CompiledTokenEntry } from '../../shared/contracts';
import { colorHex, lengthToPx, modeValue, type TokenMode } from '../../shared/token-match';
import { Icon } from './Icon';

interface PickerProps {
  label: string;
  entries: CompiledTokenEntry[];
  mode: TokenMode;
  current: string | null;
  nearest: string | null;
  onChoose: (entry: CompiledTokenEntry) => void;
}

export function tokenShortName(entry: CompiledTokenEntry): string {
  return entry.type === 'color' ? entry.cssVar : entry.path.split('.').slice(1).join('-');
}

function Preview({ entry, mode }: { entry: CompiledTokenEntry; mode: TokenMode }) {
  const value = modeValue(entry, mode);
  if (entry.type === 'color') return <span className="tk-swatch" style={{ background: value }} aria-hidden="true" />;
  if (entry.type === 'fontFamily')
    return (
      <span className="tk-glyph" style={{ fontFamily: value }} aria-hidden="true">
        Aa
      </span>
    );
  const px = lengthToPx(value);
  const size = px === null ? 0 : Math.min(16, Math.max(2, px / 4));
  return (
    <span className="tk-bar-wrap" aria-hidden="true">
      <span className="tk-bar" style={{ width: `${size}px` }} />
    </span>
  );
}

function pxNote(entry: CompiledTokenEntry, mode: TokenMode): string {
  const value = modeValue(entry, mode);
  if (entry.type === 'color') return colorHex(value) ?? value;
  if (entry.type === 'fontFamily') return value.split(',')[0]?.replace(/['"]/g, '').trim() ?? value;
  if (entry.type !== 'dimension' || value.endsWith('px')) return value;
  const px = lengthToPx(value);
  return px === null ? value : `${value} · ${Math.round(px * 100) / 100}px`;
}

function filterEntries(entries: CompiledTokenEntry[], query: string): CompiledTokenEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((entry) => entry.cssVar.toLowerCase().includes(q) || entry.value.toLowerCase().includes(q));
}

function startIndex(list: CompiledTokenEntry[], current: string | null, nearest: string | null): number {
  const at = list.findIndex((entry) => entry.cssVar === (current ?? nearest));
  return Math.max(0, at);
}

export function TokenPicker({ label, entries, mode, current, nearest, onChoose }: PickerProps) {
  const [query, setQuery] = useState('');
  const list = useMemo(() => filterEntries(entries, query), [entries, query]);
  const [active, setActive] = useState(() => startIndex(entries, current, nearest));
  const id = useId();
  const index = Math.min(active, Math.max(0, list.length - 1));
  const chosen = list[index];

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const moves: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: list.length - 1 };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      setActive(Math.min(list.length - 1, Math.max(0, next)));
      document.getElementById(`${id}-${Math.min(list.length - 1, Math.max(0, next))}`)?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && chosen) {
      event.preventDefault();
      onChoose(chosen);
    }
  };

  return (
    <div className="tk-picker">
      <div className="tk-search">
        <Icon name="search" size={13} />
        <input
          autoFocus
          aria-label={`Search ${label.toLowerCase()} tokens`}
          aria-controls={`${id}-list`}
          aria-activedescendant={chosen ? `${id}-${index}` : undefined}
          role="combobox"
          aria-expanded="true"
          placeholder="Search tokens"
          value={query}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <ul className="tk-list" role="listbox" id={`${id}-list`} aria-label={`${label} tokens`}>
        {list.map((entry, i) => (
          <li
            key={entry.cssVar}
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === index}
            className={`tk-option ${i === index ? 'active' : ''}`}
            onMouseMove={() => i !== index && setActive(i)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChoose(entry)}
          >
            <Preview entry={entry} mode={mode} />
            <span className="tk-name">{entry.cssVar}</span>
            <span className="tk-val" title={modeValue(entry, mode)}>
              {pxNote(entry, mode)}
            </span>
            <span className="tk-check" aria-hidden="true">
              {entry.cssVar === current && <Icon name="check" size={12} />}
            </span>
          </li>
        ))}
        {list.length === 0 && <li className="tk-empty">No tokens match. Try another name.</li>}
      </ul>
    </div>
  );
}
