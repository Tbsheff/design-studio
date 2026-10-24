import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { PackSummary } from '../../shared/contracts';
import { findPack, fontStack, keySwatches, loadPackFonts } from '../packs';
import { Icon } from './Icon';
import { Swatches } from './Swatches';

const NONE = 'none';
const SERIF = 'Georgia, serif';
const SANS = 'system-ui, sans-serif';

function columnsOf(list: HTMLElement | null): number {
  if (!list) return 1;
  return Math.max(1, getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length);
}

function nextIndex(key: string, index: number, count: number, cols: number): number | null {
  const moves: Record<string, number> = {
    ArrowRight: index + 1,
    ArrowLeft: index - 1,
    ArrowDown: index + cols,
    ArrowUp: index - cols,
    Home: 0,
    End: count - 1,
  };
  const target = moves[key];
  if (target === undefined) return null;
  return Math.min(count - 1, Math.max(0, target));
}

function NoneCard() {
  return (
    <>
      <span className="pack-specimen none" aria-hidden="true">
        <Icon name="close" size={14} />
      </span>
      <span className="pack-text">
        <span className="pack-name">No design system</span>
        <span className="pack-desc">The agent picks colors and type for each project.</span>
      </span>
    </>
  );
}

function swatchValue(pack: PackSummary, name: string): string | undefined {
  return pack.swatches.find((swatch) => swatch.name === name)?.value;
}

function PackCard({ pack }: { pack: PackSummary }) {
  const colors = { background: swatchValue(pack, 'bg'), color: swatchValue(pack, 'fg') };
  return (
    <>
      <span className="pack-specimen" style={colors} aria-hidden="true">
        <span className="pack-aa" style={{ fontFamily: fontStack(pack.fonts.display, SERIF) }}>
          Aa
        </span>
        <span className="pack-line" style={{ fontFamily: fontStack(pack.fonts.body, SANS) }}>
          Quick brown fox
        </span>
      </span>
      <span className="pack-text">
        <span className="pack-name">
          <span className="truncate">{pack.name}</span>
          {pack.source === 'user' && <span className="pack-yours">Yours</span>}
        </span>
        <span className="pack-desc" title={pack.description}>{pack.description}</span>
        <Swatches swatches={pack.swatches} max={7} />
      </span>
    </>
  );
}

interface ListProps {
  packs: PackSummary[] | null;
  value: string | null;
  includeNone: boolean;
  onChoose: (pack: PackSummary | null) => void;
  onTab?: () => void;
}

export function PackList({ packs, value, includeNone, onChoose, onTab }: ListProps) {
  const options: (PackSummary | null)[] = includeNone ? [null, ...(packs ?? [])] : (packs ?? []);
  const selected = findPack(packs, value);
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const ready = packs !== null;
  const selectedIndex = options.findIndex((pack) => (pack?.id ?? null) === (selected?.id ?? null));

  useEffect(() => {
    if (ready) setActive(Math.max(0, selectedIndex));
  }, [ready]);

  useEffect(() => {
    if (packs) loadPackFonts(packs);
  }, [packs]);

  useEffect(() => {
    if (!ready) return;
    list.current?.parentElement?.scrollIntoView({ block: 'nearest' });
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.focus({ preventScroll: false });
  }, [active, ready]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (options.length > 0) onChoose(options[active] ?? null);
      return;
    }
    if (e.key === 'Tab') return onTab?.();
    const next = nextIndex(e.key, active, options.length, columnsOf(list.current));
    if (next === null) return;
    e.preventDefault();
    setActive(next);
  };

  return (
    <div ref={list} className="pack-list" role="listbox" aria-label="Design systems" onKeyDown={onKey}>
      {options.map((pack, index) => {
        const isSelected = (pack?.id ?? null) === (selected?.id ?? null);
        return (
          <div
            key={pack?.id ?? NONE}
            role="option"
            aria-label={pack?.name ?? 'No design system'}
            aria-selected={isSelected}
            tabIndex={index === active ? 0 : -1}
            data-index={index}
            className={`pack-card ${isSelected ? 'selected' : ''}`}
            onClick={() => onChoose(pack)}
            onMouseMove={() => index !== active && setActive(index)}
          >
            {pack ? <PackCard pack={pack} /> : <NoneCard />}
            {isSelected && (
              <span className="pack-check" aria-hidden="true">
                <Icon name="check" size={12} />
              </span>
            )}
          </div>
        );
      })}
      {packs === null && <div className="pack-card skeleton" aria-hidden="true" />}
    </div>
  );
}

