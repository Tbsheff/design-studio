import { RUN_LEVELS } from "@design-studio/contracts";
import type { RunLevel } from "@design-studio/contracts";
import { useId, useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { LEVEL_PRESETS } from "../../../shared/run-levels.js";
import { copy } from "./copy.js";

const STEP: Record<string, number> = {
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -1,
};

const nextRadioOption = <T,>(
  options: readonly T[],
  current: T,
  key: string,
  isDisabled: (option: T) => boolean = () => false
): T | null => {
  const enabled = options.filter((option) => !isDisabled(option));

  if (enabled.length === 0) {
    return null;
  }

  if (key === "Home") {
    return enabled[0] ?? null;
  }

  if (key === "End") {
    return enabled.at(-1) ?? null;
  }

  const step = STEP[key];

  if (step === undefined) {
    return null;
  }

  const at = enabled.indexOf(current);

  if (at === -1) {
    return enabled[step > 0 ? 0 : enabled.length - 1] ?? null;
  }

  return enabled[(at + step + enabled.length) % enabled.length] ?? null;
};

interface ItemResult {
  readonly ref: (el: HTMLButtonElement | null) => void;
  readonly tabIndex: number;
}

interface UseRovingRadioGroupResult<T> {
  readonly item: (option: T) => ItemResult;
  readonly onKeyDown: (event: KeyboardEvent) => void;
}

const useRovingRadioGroup = <T extends string | number>(
  options: readonly T[],
  value: T,
  onChange: (next: T) => void,
  isDisabled?: (option: T) => boolean
): UseRovingRadioGroupResult<T> => {
  const refs = useRef(new Map<T, HTMLButtonElement | null>());

  const onKeyDown = (event: KeyboardEvent): void => {
    const next = nextRadioOption(options, value, event.key, isDisabled);

    if (next === null) {
      return;
    }

    event.preventDefault();

    if (next !== value) {
      onChange(next);
    }

    refs.current.get(next)?.focus();
  };

  const item = (option: T): ItemResult => ({
    ref: (el: HTMLButtonElement | null): void => {
      refs.current.set(option, el);
    },
    tabIndex: option === value ? 0 : -1,
  });

  return { item, onKeyDown };
};

interface Props {
  value: RunLevel;
  onChange: (level: RunLevel) => void;
  disabled?: boolean;
  tipSide?: "top" | "bottom";
}

const LevelControl = ({
  value,
  onChange,
  disabled,
  tipSide = "top",
}: Props): ReactElement => {
  const baseId = useId();
  const radios = useRovingRadioGroup(RUN_LEVELS, value, onChange);

  return (
    <div
      tabIndex={0}
      className="segmented level-control"
      role="radiogroup"
      aria-label={copy.runLevel}
      data-testid="level-control"
      onKeyDown={radios.onKeyDown}
    >
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
            className={on ? "on" : ""}
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
};

const levelLabel = (level: RunLevel): string => LEVEL_PRESETS[level].label;

const levelHint = (level: RunLevel): string => LEVEL_PRESETS[level].hint;

const levelGist = (
  level: RunLevel
): {
  hint: string;
  cost: string | null;
} => {
  const match = /^(.*?) \(usually ([^,)]+)/u.exec(LEVEL_PRESETS[level].hint);

  if (!match) {
    return { cost: null, hint: levelShortHint(level) };
  }

  return { cost: (match[2] ?? "").replace(" to ", "–"), hint: match[1] ?? "" };
};

const levelShortHint = (level: RunLevel): string => {
  const { hint } = LEVEL_PRESETS[level];
  const match = /^(.*?) \(usually ([^,)]+)/u.exec(hint);

  return match ? `${match[1]}, ${match[2]}` : (hint.split(". ")[0] ?? hint);
};

const ChoiceItem = ({
  label,
  hint,
  meta,
  full,
  checked,
  focusable,
  onPick,
}: {
  label: string;
  hint: string;
  meta?: string | null;
  full: string;
  checked: boolean;
  focusable?: boolean;
  onPick: () => void;
}): ReactElement => {
  const id = useId();

  return (
    <button
      type="button"
      role="menuitemradio"
      className="ui-menu-item choice-item"
      aria-checked={checked}
      aria-describedby={id}
      tabIndex={focusable && checked ? 0 : -1}
      onClick={onPick}
    >
      <span className="choice-label">{label}</span>
      <span className="choice-hint" aria-hidden="true">
        {hint}
      </span>
      {meta && (
        <span className="ui-menu-meta" aria-hidden="true">
          {meta}
        </span>
      )}
      <span id={id} hidden>
        {full}
      </span>
    </button>
  );
};

export {
  ChoiceItem,
  LevelControl,
  levelGist,
  levelHint,
  levelLabel,
  levelShortHint,
  nextRadioOption,
  useRovingRadioGroup,
};
