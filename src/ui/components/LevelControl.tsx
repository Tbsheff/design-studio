import { useId, useRef, type KeyboardEvent } from 'react';
import { RUN_LEVELS, type RunLevel } from '../../shared/contracts';
import { LEVEL_PRESETS } from '../../shared/run-levels';

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export function nextRadioOption<T>(options: readonly T[], current: T, key: string, isDisabled: (option: T) => boolean = () => false): T | null {
  const enabled = options.filter((option) => !isDisabled(option));
  if (enabled.length === 0) return null;
  if (key === 'Home') return enabled[0] ?? null;
  if (key === 'End') return enabled[enabled.length - 1] ?? null;
  const step = STEP[key];
  if (step === undefined) return null;
  const at = enabled.indexOf(current);
  if (at === -1) return enabled[step > 0 ? 0 : enabled.length - 1] ?? null;
  return enabled[(at + step + enabled.length) % enabled.length] ?? null;
}

export function useRovingRadioGroup<T extends string | number>(options: readonly T[], value: T, onChange: (next: T) => void, isDisabled?: (option: T) => boolean) {
  const refs = useRef(new Map<T, HTMLButtonElement | null>());
  const onKeyDown = (event: KeyboardEvent) => {
    const next = nextRadioOption(options, value, event.key, isDisabled);
    if (next === null) return;
    event.preventDefault();
    if (next !== value) onChange(next);
    refs.current.get(next)?.focus();
  };
  const item = (option: T) => ({
    ref: (el: HTMLButtonElement | null) => {
      refs.current.set(option, el);
    },
    tabIndex: option === value ? 0 : -1,
  });
  return { onKeyDown, item };
}

interface Props {
  value: RunLevel;
  onChange: (level: RunLevel) => void;
  disabled?: boolean;
  tipSide?: 'top' | 'bottom';
}

export function LevelControl({ value, onChange, disabled, tipSide = 'top' }: Props) {
  const baseId = useId();
  const radios = useRovingRadioGroup(RUN_LEVELS, value, onChange);
  return (
    <div className="segmented level-control" role="radiogroup" aria-label="Run level" data-testid="level-control" onKeyDown={radios.onKeyDown}>
      {RUN_LEVELS.map((level) => {
        const on = level === value;
        return (
          <button
            key={level}
            {...radios.item(level)}
            type="button"
            role="radio"
            aria-checked={on}
            aria-describedby={`${baseId}-${level}-hint`}
            disabled={disabled}
            className={on ? 'on' : ''}
            data-testid={`level-option-${level}`}
            data-tip={LEVEL_PRESETS[level].hint}
            data-tip-side={tipSide}
            onClick={() => onChange(level)}
          >
            {LEVEL_PRESETS[level].label}
          </button>
        );
      })}
      {RUN_LEVELS.map((level) => (
        <span key={level} id={`${baseId}-${level}-hint`} hidden>
          {LEVEL_PRESETS[level].hint}
        </span>
      ))}
    </div>
  );
}

export function levelLabel(level: RunLevel): string {
  return LEVEL_PRESETS[level].label;
}

export function levelHint(level: RunLevel): string {
  return LEVEL_PRESETS[level].hint;
}
