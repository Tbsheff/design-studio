import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { colorHex } from '../../shared/token-match';
import { colorToHex, formatNumber, parseNumber } from '../cssValues';

interface ValueProps {
  label: string;
  value: string;
  invalid?: boolean;
  onChange: (next: string) => void;
}

const SCRUB_PX_PER_STEP = 2;
const NEUTRAL_SWATCH = '#ffffff';

function useDraftText(value: string, onChange: (next: string) => void) {
  const [text, setText] = useState<string | null>(null);
  const change = (next: string) => {
    setText(next);
    if (next.trim() !== '') onChange(next.trim());
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setText(null);
      event.currentTarget.blur();
    }
  };
  return { shown: text ?? value, change, onKeyDown, settle: () => setText(null) };
}

export function TextValue({ label, value, invalid, onChange, mono }: ValueProps & { mono?: boolean }) {
  const t = useDraftText(value, onChange);
  return (
    <div className={`ins-field tkp-field ${mono ? 'mono' : ''}`}>
      <input
        className="ins-input tkp-text"
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={t.shown}
        title={value}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => t.change(event.target.value)}
        onKeyDown={t.onKeyDown}
        onBlur={t.settle}
      />
    </div>
  );
}

export function ColorValue({ label, value, invalid, onChange, swatch, suffix }: ValueProps & { swatch: string; suffix?: string }) {
  const t = useDraftText(value, onChange);
  const hex = colorToHex(swatch) ?? colorHex(swatch);
  return (
    <div className="ins-field color tkp-field">
      <span className={`ins-swatch ${hex ? '' : 'empty'}`} style={{ ['--swatch' as string]: swatch || 'transparent' }}>
        <input
          type="color"
          aria-label={`${label} picker`}
          value={hex ?? NEUTRAL_SWATCH}
          onInput={(event) => onChange(event.currentTarget.value)}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </span>
      <input
        className="ins-input"
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={t.shown}
        title={value}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => t.change(event.target.value)}
        onKeyDown={t.onKeyDown}
        onBlur={t.settle}
      />
      {suffix && (
        <span className="ins-suffix tkp-suffix" aria-hidden="true">
          {suffix}
        </span>
      )}
    </div>
  );
}

function stepFor(unit: string, shift: boolean): number {
  const base = unit === 'rem' || unit === 'em' ? 0.0625 : 1;
  return base * (shift ? 10 : 1);
}

function stepped(value: string, steps: number, shift: boolean): string | null {
  const parsed = parseNumber(value);
  if (!parsed) return null;
  return formatNumber(parsed.value + steps * stepFor(parsed.unit, shift), parsed.unit);
}

function useScrub(value: string, onChange: (next: string) => void) {
  const start = useRef<{ x: number; value: string } | null>(null);
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !parseNumber(value)) return;
    event.preventDefault();
    start.current = { x: event.clientX, value };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s) return;
    const next = stepped(s.value, Math.round((event.clientX - s.x) / SCRUB_PX_PER_STEP), event.shiftKey);
    if (next) onChange(next);
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    start.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}

export function DimensionValue({ label, value, invalid, onChange, short, id }: ValueProps & { short: string; id: string }) {
  const t = useDraftText(value, onChange);
  const scrub = useScrub(value, onChange);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return t.onKeyDown(event);
    const next = stepped(t.shown, event.key === 'ArrowUp' ? 1 : -1, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    t.change(next);
  };
  return (
    <div className="ins-field tkp-field">
      <label htmlFor={id} className={`ins-scrub ${parseNumber(value) ? '' : 'static'}`} {...scrub}>
        {short}
      </label>
      <input
        id={id}
        className="ins-input num"
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={t.shown}
        title={value}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => t.change(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={t.settle}
      />
    </div>
  );
}
