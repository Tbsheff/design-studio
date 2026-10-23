import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import type { DirectStyleProperty } from '../../shared/contracts';
import { formatNumber, normalizeLength, parseNumber, stepValue } from '../cssValues';
import { lengthToPx, resolveTokenValue, varName } from '../../shared/token-match';
import type { DirectEdit } from '../useDirectEdit';
import { useTokenUi, type TokenUi } from '../useTokenSnap';
import { TokenControl } from './TokenControl';

interface NumberSpec {
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

function stepOf(event: { shiftKey: boolean }, spec: NumberSpec): number {
  return (spec.step ?? 1) * (event.shiftKey ? 10 : 1);
}

export function NumberInput({ spec, id, className }: { spec: NumberSpec; id?: string; className?: string }) {
  const { edit, prop } = spec;
  const [text, setText] = useState<string | null>(null);
  const ui = useTokenUi();
  const unit = spec.unit ?? 'px';
  const shown = text ?? plainLength(edit.values[prop], ui);

  const apply = (raw: string) => {
    setText(raw);
    edit.preview(patchFor(spec, clamp(normalizeLength(raw, unit), spec)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const delta = stepOf(event, spec) * (event.key === 'ArrowUp' ? 1 : -1);
      apply(clamp(stepValue(shown, delta, unit), spec));
      edit.commit();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      setText(null);
      edit.commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setText(null);
      edit.revert(spec.targets ?? [prop]);
    }
  };

  return (
    <input
      id={id}
      className={`ins-input num ${className ?? ''}`}
      aria-label={spec.label}
      value={shown}
      spellCheck={false}
      autoComplete="off"
      placeholder="—"
      onChange={(event) => apply(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => {
        setText(null);
        edit.commit();
      }}
    />
  );
}

function useScrub(spec: NumberSpec) {
  const start = useRef<{ x: number; value: number; unit: string } | null>(null);
  const ui = useTokenUi();
  const unit = spec.unit ?? 'px';
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const parsed = parseNumber(plainLength(spec.edit.values[spec.prop], ui)) ?? { value: 0, unit };
    start.current = { x: event.clientX, value: parsed.value, unit: parsed.unit || unit };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s) return;
    const steps = Math.round((event.clientX - s.x) / SCRUB_PX_PER_STEP);
    const next = clamp(formatNumber(s.value + steps * stepOf(event, spec), s.unit), spec);
    spec.edit.preview(patchFor(spec, next));
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (!start.current) return;
    start.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    spec.edit.commit();
  };
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}

export function NumberField({ spec, short, icon }: { spec: NumberSpec; short: string; icon?: ReactNode }) {
  const id = `ins-${spec.prop}`;
  const scrub = useScrub(spec);
  return (
    <div className="ins-field">
      <label htmlFor={id} className="ins-scrub" title={`Drag to change ${spec.label.toLowerCase()}`} {...scrub}>
        {icon ?? short}
      </label>
      <NumberInput spec={spec} id={id} />
      <TokenControl prop={spec.prop} label={spec.label} edit={spec.edit} targets={spec.targets} />
    </div>
  );
}
