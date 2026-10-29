import { memo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import type { DirectStyleProperty } from '../../shared/contracts';
import { formatNumber, normalizeLength, parseNumber, stepValue } from '../cssValues';
import { resolveNumberInput } from '../mathInput';
import { dependsOnCurrent } from '../mixedValues';
import { lengthToPx, resolveTokenValue, varName } from '../../shared/token-match';
import { sameEditValues, type DirectEdit } from '../useDirectEdit';
import { useInherited } from '../editVariant';
import { useTokenUi, type TokenUi } from '../useTokenSnap';
import { TokenControl } from './TokenControl';

export interface NumberSpec {
  prop: DirectStyleProperty;
  label: string;
  edit: DirectEdit;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  targets?: DirectStyleProperty[];
}

const SCRUB_PX_PER_STEP = 2;

function plainLength(value: string, ui: TokenUi | null): string {
  if (!ui || !varName(value)) return value;
  const resolved = resolveTokenValue(value, ui.entries, ui.mode);
  const px = lengthToPx(resolved);
  return px === null ? resolved : formatNumber(px, 'px');
}

function displayLength(value: string): string {
  const parsed = parseNumber(value);
  if (!parsed || parsed.unit !== 'px' || Number.isInteger(parsed.value)) return value;
  return formatNumber(Math.round(parsed.value * 10) / 10, 'px');
}

function clamp(value: string, spec: NumberSpec): string {
  const parsed = parseNumber(value);
  if (!parsed) return value;
  const lo = spec.min ?? -Infinity;
  const hi = spec.max ?? Infinity;
  const bounded = Math.min(hi, Math.max(lo, parsed.value));
  return bounded === parsed.value ? value : formatNumber(bounded, parsed.unit);
}

function patchFor(spec: NumberSpec, value: string): Partial<Record<DirectStyleProperty, string>> {
  const targets = spec.targets ?? [spec.prop];
  return Object.fromEntries(targets.map((prop) => [prop, value]));
}

function stepOf(event: { shiftKey: boolean; altKey?: boolean }, spec: NumberSpec): number {
  const base = spec.step ?? 1;
  if (event.shiftKey) return base * 10;
  return event.altKey ? base / 10 : base;
}

function isValidValue(prop: DirectStyleProperty, value: string): boolean {
  if (value.trim() === '' || typeof CSS === 'undefined' || !CSS.supports) return true;
  return CSS.supports(prop, value);
}

function selectSoon(input: HTMLInputElement): void {
  requestAnimationFrame(() => {
    if (document.activeElement === input) input.select();
  });
}

function sameSpec(a: NumberSpec, b: NumberSpec): boolean {
  const targets = a.targets ?? [a.prop];
  const sameShape = a.prop === b.prop && a.label === b.label && a.unit === b.unit && a.step === b.step && a.min === b.min && a.max === b.max;
  return sameShape && targets.join() === (b.targets ?? [b.prop]).join() && sameEditValues(a.edit, b.edit, targets);
}

interface InputProps {
  spec: NumberSpec;
  id?: string;
  className?: string;
}

function useNumberText(spec: NumberSpec) {
  const { edit, prop } = spec;
  const [text, setText] = useState<string | null>(null);
  const start = useRef<string | null>(null);
  const last = useRef<string | null>(null);
  const ui = useTokenUi();
  const unit = spec.unit ?? 'px';
  const current = plainLength(edit.values[prop], ui);
  const mixed = edit.mixed.has(prop);

  const apply = (raw: string) => {
    if (start.current === null) start.current = current;
    setText(raw);
    if (mixed && dependsOnCurrent(raw, unit)) return;
    const math = resolveNumberInput(raw, start.current, unit);
    if (math === null && /[-+*/(]\s*$/.test(raw)) return;
    const next = clamp(math ?? normalizeLength(raw, unit), spec);
    last.current = next;
    edit.preview(patchFor(spec, next));
  };

  const settle = () => {
    const typed = last.current;
    start.current = null;
    last.current = null;
    setText(null);
    if (typed !== null && !isValidValue(prop, typed)) edit.revert(spec.targets ?? [prop]);
    edit.commit();
  };

  const nudge = (delta: number, from: string) => {
    start.current = null;
    last.current = null;
    const next = clamp(stepValue(from, delta, unit), spec);
    setText(next);
    edit.preview(patchFor(spec, next));
    edit.commitSoon();
  };

  const cancel = () => {
    start.current = null;
    last.current = null;
    setText(null);
    edit.revert(spec.targets ?? [prop]);
  };

  return { text, current, mixed, unit, apply, settle, nudge, cancel };
}

function NumberInputView({ spec, id, className }: InputProps) {
  const [focused, setFocused] = useState(false);
  const keepSelection = useRef(false);
  const field = useNumberText(spec);
  const inherited = useInherited(spec.prop);
  const shown = field.text ?? (focused ? field.current : displayLength(field.current));
  const refused = field.mixed && field.text !== null && dependsOnCurrent(field.text, field.unit);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (field.mixed) return;
      field.nudge(stepOf(event, spec) * (event.key === 'ArrowUp' ? 1 : -1), shown);
      selectSoon(input);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      field.settle();
      selectSoon(input);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      field.cancel();
      input.blur();
    }
  };

  return (
    <input
      id={id}
      className={`ins-input num ${className ?? ''} ${inherited ? 'inherited' : ''}`}
      aria-label={spec.label}
      value={shown}
      spellCheck={false}
      autoComplete="off"
      placeholder={field.mixed ? 'Mixed' : '—'}
      aria-invalid={refused || undefined}
      data-tip={refused ? 'Values differ. Type a number, not a change.' : undefined}
      onChange={(event) => field.apply(event.target.value)}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        keepSelection.current = document.activeElement !== event.currentTarget;
      }}
      onMouseUp={(event) => {
        if (!keepSelection.current) return;
        keepSelection.current = false;
        event.preventDefault();
      }}
      onFocus={(event) => {
        setFocused(true);
        event.currentTarget.select();
      }}
      onBlur={() => {
        setFocused(false);
        field.settle();
      }}
    />
  );
}

export const NumberInput = memo(NumberInputView, (a, b) => a.id === b.id && a.className === b.className && sameSpec(a.spec, b.spec));

interface Scrub {
  x: number;
  value: number;
  unit: string;
  moved: boolean;
}

function scrubStart(spec: NumberSpec, ui: TokenUi | null, x: number): Scrub {
  const unit = spec.unit ?? 'px';
  const parsed = parseNumber(plainLength(spec.edit.values[spec.prop], ui)) ?? { value: 0, unit };
  return { x, value: parsed.value, unit: parsed.unit || unit, moved: false };
}

function useScrub(spec: NumberSpec) {
  const scrub = useRef<Scrub | null>(null);
  const scrubbed = useRef(false);
  const ui = useTokenUi();
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    if (spec.edit.mixed.has(spec.prop)) return;
    scrub.current = scrubStart(spec, ui, event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const s = scrub.current;
    if (!s) return;
    const steps = Math.trunc((event.clientX - s.x) / SCRUB_PX_PER_STEP);
    if (steps === 0) return;
    s.x += steps * SCRUB_PX_PER_STEP;
    s.value = parseNumber(clamp(formatNumber(s.value + steps * stepOf(event, spec), s.unit), spec))?.value ?? s.value;
    s.moved = true;
    document.body.classList.add('ins-scrubbing');
    spec.edit.preview(patchFor(spec, formatNumber(s.value, s.unit)));
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const s = scrub.current;
    if (!s) return;
    scrub.current = null;
    document.body.classList.remove('ins-scrubbing');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    scrubbed.current = s.moved;
    if (s.moved) spec.edit.commit();
  };
  const onClick = (event: MouseEvent<HTMLElement>) => {
    if (!scrubbed.current) return;
    scrubbed.current = false;
    event.preventDefault();
  };
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClick };
}

interface NumberFieldProps {
  spec: NumberSpec;
  short: string;
  icon?: ReactNode;
  id?: string;
  tokens?: boolean;
  className?: string;
}

function NumberFieldView({ spec, short, icon, id: idProp, tokens = true, className }: NumberFieldProps) {
  const id = idProp ?? `ins-${spec.prop}`;
  const scrub = useScrub(spec);
  return (
    <div className={`ins-field ${className ?? ''}`}>
      <label htmlFor={id} className="ins-scrub" {...scrub}>
        {icon ?? short}
      </label>
      <NumberInput spec={spec} id={id} />
      {tokens && <TokenControl prop={spec.prop} label={spec.label} edit={spec.edit} targets={spec.targets} />}
    </div>
  );
}

function sameField(a: NumberFieldProps, b: NumberFieldProps): boolean {
  const sameIcon = (a.icon === undefined) === (b.icon === undefined);
  return sameIcon && a.short === b.short && a.id === b.id && a.tokens === b.tokens && a.className === b.className && sameSpec(a.spec, b.spec);
}

export const NumberField = memo(NumberFieldView, sameField);
