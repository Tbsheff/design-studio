import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { PackSummary } from '../../shared/contracts';
import { findPack, fontStack, keySwatches, loadPackFonts, type PacksState } from '../packs';
import { usePopover } from '../usePopover';
import { Icon } from './Icon';
import { Swatches } from './Swatches';

const NONE = 'none';
const SERIF = 'Georgia, serif';
const SANS = 'system-ui, sans-serif';

interface Props {
  state: PacksState;
  value: string | null;
  onChange: (packId: string | null) => void;
}

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
        <span className="pack-name">{pack.name}</span>
        <span className="pack-desc" title={pack.description}>{pack.description}</span>
        <Swatches swatches={pack.swatches} max={7} />
      </span>
    </>
  );
}

function TriggerLabel({ pack }: { pack: PackSummary | null }) {
  if (!pack) {
    return (
      <>
        <Icon name="palette" size={14} />
        <span className="pack-trigger-text">Style</span>
      </>
    );
  }
  return (
    <>
      <Swatches swatches={keySwatches(pack)} max={3} size="sm" />
      <span className="pack-trigger-text truncate">{pack.name}</span>
    </>
  );
}

export function PackPicker({ state, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options: (PackSummary | null)[] = [null, ...(state.packs ?? [])];
  const selected = findPack(state.packs, value);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);
  usePopover(open, root, close);

  useEffect(() => {
    if (!open) return;
    if (state.packs) loadPackFonts(state.packs);
    list.current?.parentElement?.scrollIntoView({ block: 'nearest' });
    const el = list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.focus({ preventScroll: false });
  }, [open, active, state.packs]);

  const openPicker = () => {
    const index = options.findIndex((pack) => (pack?.id ?? null) === (selected?.id ?? null));
    setActive(Math.max(0, index));
    setOpen(true);
  };

  const choose = (pack: PackSummary | null) => {
    onChange(pack?.id ?? null);
    close(true);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(options[active] ?? null);
      return;
    }
    if (e.key === 'Tab') return setOpen(false);
    const next = nextIndex(e.key, active, options.length, columnsOf(list.current));
    if (next === null) return;
    e.preventDefault();
    setActive(next);
  };

  return (
    <div className="pack-picker" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={`btn ghost small pack-trigger ${selected ? 'chosen' : ''}`}
        aria-label="Design system"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={selected ? `Design system: ${selected.name}` : 'Design system'}
        onClick={() => (open ? close(false) : openPicker())}
      >
        <TriggerLabel pack={selected} />
        <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <div className="pack-popover" role="presentation">
          <div className="pack-popover-head">
            <strong>Design system</strong>
            <span>Tokens, fonts and a DESIGN.md go into the project. The agent builds with them.</span>
          </div>
          {state.error && <div className="alert error small">Could not load design systems. {state.error}</div>}
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
                  onClick={() => choose(pack)}
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
            {state.packs === null && <div className="pack-card skeleton" aria-hidden="true" />}
          </div>
        </div>
      )}
    </div>
  );
}
