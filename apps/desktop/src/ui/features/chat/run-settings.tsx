import type { RunEffort, RunLevel } from "@design-studio/contracts";
import { Icon, placeFixed, usePopover } from "@design-studio/ui";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties, KeyboardEvent, ReactElement } from "react";
import { createPortal } from "react-dom";

import { cn } from "../../ai/lib/utils.js";
import { VariationsControl } from "../canvas/variations-control.js";
import { MODE_LABEL } from "./composer-mode-model.js";
import type { ComposerMode } from "./composer-mode-model.js";
import { copy } from "./copy.js";
import {
  LevelControl,
  levelHint,
  levelLabel,
  useRovingRadioGroup,
} from "./level-control.js";

interface DesignsSetting {
  value: number;
  max: number;
  onChange: (count: number) => void;
  disabledReason: string | null;
}

const EFFORTS = ["auto", "low", "medium", "high"] as const;

type EffortChoice = (typeof EFFORTS)[number];

const EFFORT_HINT: Record<EffortChoice, string> = {
  auto: "The model picks how hard to think.",
  high: "Thinks the longest. Best for large or tricky work.",
  low: "Fastest and cheapest. Good for small changes.",
  medium: "A balance of speed and care.",
};

interface ModeSetting {
  value: ComposerMode;
  onChange: (mode: ComposerMode) => void;
}

interface EffortSetting {
  value: RunEffort | null;
  onChange: (effort: RunEffort | null) => void;
}

interface Props {
  effort?: EffortSetting;
  mode?: ModeSetting;
  level: RunLevel;
  onLevel: (level: RunLevel) => void;
  designs?: DesignsSetting;
  onOpen?: () => void;
}

const MODE_HINT: Record<ComposerMode, string> = {
  critique: "Send asks for a review. The design does not change.",
  edit: "Send changes the design.",
  plan: "Send makes a plan first. Files change only after you approve it.",
};

const UNPLACED: CSSProperties = {
  left: 0,
  opacity: 0,
  pointerEvents: "none",
  top: 0,
};

const EFFORT_LABEL: Record<EffortChoice, string> = {
  auto: "Auto",
  high: "High",
  low: "Low",
  medium: "Medium",
};

const runSettingsSummary = (input: {
  mode?: ComposerMode;
  level: RunLevel;
  designs?: number;
  designsOn?: boolean;
  effort?: RunEffort | null;
}): string => {
  const parts = [
    input.mode ? MODE_LABEL[input.mode] : null,
    levelLabel(input.level),
    input.effort ? `${EFFORT_LABEL[input.effort]} effort` : null,
  ];

  if (
    input.designsOn !== false &&
    input.designs !== undefined &&
    input.designs > 1
  ) {
    parts.push(`${input.designs} designs`);
  }

  return parts.filter(Boolean).join(" · ");
};

const designsHint = (designs: DesignsSetting): string => {
  if (designs.disabledReason) {
    return designs.disabledReason;
  }

  if (designs.value > 1) {
    return `Send makes ${designs.value} designs side by side.`;
  }

  return `Pick 2 to ${designs.max} to compare options.`;
};

const placeAboveOrBelow = (
  trigger: HTMLElement,
  panel: HTMLElement
): CSSProperties => {
  const placed = placeFixed(trigger, panel, { prefer: "above" });
  const rect = trigger.getBoundingClientRect();
  const left = typeof placed.left === "number" ? placed.left : rect.left;
  const centerX = Math.round(rect.left + rect.width / 2 - left);
  const above = placed.bottom !== undefined;

  return {
    ...placed,
    "--pop-dy": above ? "4px" : "-4px",
    transformOrigin: `${centerX}px ${above ? "bottom" : "top"}`,
  } as CSSProperties;
};

const tabStops = (panel: HTMLElement): HTMLElement[] => [
  ...panel.querySelectorAll<HTMLElement>('[tabindex="0"]:not(:disabled)'),
];

const EffortToggle = ({
  effort,
  hintId,
}: {
  effort: EffortSetting;
  hintId: string;
}): ReactElement => {
  const choice: EffortChoice = effort.value ?? "auto";

  const pick = (next: EffortChoice): void =>
    effort.onChange(next === "auto" ? null : next);

  const radios = useRovingRadioGroup(EFFORTS, choice, pick);

  return (
    <div
      tabIndex={0}
      className="segmented"
      role="radiogroup"
      aria-label={copy.effort}
      aria-describedby={hintId}
      onKeyDown={radios.onKeyDown}
    >
      {EFFORTS.map((effortOption) => (
        <button
          key={effortOption}
          {...radios.item(effortOption)}
          type="button"
          role="radio"
          aria-checked={choice === effortOption}
          className={cn(choice === effortOption && "on")}
          onClick={() => pick(effortOption)}
        >
          {EFFORT_LABEL[effortOption]}
        </button>
      ))}
    </div>
  );
};

const MODES = ["edit", "plan", "critique"] as const;

const ModeToggle = ({
  mode,
  hintId,
}: {
  mode: ModeSetting;
  hintId: string;
}): ReactElement => {
  const radios = useRovingRadioGroup(MODES, mode.value, mode.onChange);

  return (
    <div
      tabIndex={0}
      className="segmented"
      role="radiogroup"
      aria-label={copy.runMode}
      aria-describedby={hintId}
      onKeyDown={radios.onKeyDown}
    >
      {MODES.map((choice) => (
        <button
          key={choice}
          {...radios.item(choice)}
          type="button"
          role="radio"
          aria-checked={mode.value === choice}
          className={cn(mode.value === choice && "on")}
          onClick={() => mode.onChange(choice)}
        >
          {MODE_LABEL[choice]}
        </button>
      ))}
    </div>
  );
};

const RunSettings = ({
  mode,
  level,
  onLevel,
  designs,
  onOpen,
  effort,
}: Props): ReactElement => {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>(UNPLACED);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  let designsOn = false;

  if (designs) {
    designsOn = designs.disabledReason === null;
  }

  const summary = runSettingsSummary({
    designs: designs?.value,
    designsOn,
    effort: effort?.value ?? null,
    level,
    mode: mode?.value,
  });

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setStyle(UNPLACED);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  usePopover(open, panel, close, trigger);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const place = (): void => {
      if (trigger.current && panel.current) {
        setStyle(placeAboveOrBelow(trigger.current, panel.current));
      }
    };

    place();
    window.addEventListener("resize", place);
    const observer = new ResizeObserver(place);

    if (panel.current) {
      observer.observe(panel.current);
    }

    if (trigger.current) {
      observer.observe(trigger.current);
    }

    return (): void => {
      window.removeEventListener("resize", place);
      observer.disconnect();
    };
  }, [open]);

  useEffect(() => {
    if (open && panel.current) {
      tabStops(panel.current)[0]?.focus();
    }
  }, [open]);

  const onPanelKey = (event: KeyboardEvent): void => {
    if (event.key !== "Tab" || !panel.current) {
      return;
    }

    const stops = tabStops(panel.current);
    const leavingStart = event.shiftKey && document.activeElement === stops[0];

    const leavingEnd =
      !event.shiftKey && document.activeElement === stops.at(-1);

    if (!leavingStart && !leavingEnd) {
      return;
    }

    event.preventDefault();
    close(true);
  };

  return (
    <span className="run-settings">
      <button
        ref={trigger}
        type="button"
        className="btn small ghost run-settings-trigger"
        data-testid="run-settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-tip={copy.runSettings}
        data-tip-side="top"
        data-tip-align="start"
        onClick={() => {
          if (open) {
            return close(false);
          }

          onOpen?.();
          setOpen(true);
        }}
      >
        <span className="run-settings-summary">{summary}</span>
        <Icon name="chevronDown" size={12} />
      </button>
      {open &&
        createPortal(
          <div
            className="run-settings-pop"
            ref={panel}
            style={style}
            role="dialog"
            aria-label={copy.runSettings}
            data-testid="run-settings-popover"
            onKeyDown={onPanelKey}
          >
            {mode && (
              <section className="rs-group">
                <h3 className="rs-label">{copy.mode}</h3>
                <ModeToggle mode={mode} hintId={`${id}-mode-hint`} />
                <p className="rs-hint" id={`${id}-mode-hint`}>
                  {MODE_HINT[mode.value]}
                </p>
              </section>
            )}
            <section className="rs-group">
              <h3 className="rs-label">{copy.level}</h3>
              <LevelControl value={level} onChange={onLevel} />
              <p className="rs-hint">{levelHint(level)}</p>
            </section>
            {effort && (
              <section className="rs-group">
                <h3 className="rs-label">{copy.effort}</h3>
                <EffortToggle effort={effort} hintId={`${id}-effort-hint`} />
                <p className="rs-hint" id={`${id}-effort-hint`}>
                  {EFFORT_HINT[effort.value ?? "auto"]}
                </p>
              </section>
            )}
            {designs && (
              <section className="rs-group">
                <h3 className="rs-label" id={`${id}-designs`}>
                  {copy.designs}
                </h3>
                <VariationsControl
                  value={designs.value}
                  max={designs.max}
                  onChange={designs.onChange}
                  disabled={designs.disabledReason !== null}
                  labelledBy={`${id}-designs`}
                />
                <p className="rs-hint">{designsHint(designs)}</p>
              </section>
            )}
          </div>,
          document.body
        )}
    </span>
  );
};

export {
  EFFORT_HINT,
  EFFORT_LABEL,
  EffortToggle,
  MODE_HINT,
  MODE_LABEL,
  RunSettings,
  UNPLACED,
  designsHint,
  placeAboveOrBelow,
  runSettingsSummary,
};

export type { ComposerMode, DesignsSetting, EffortSetting };
