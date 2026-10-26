import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { RunEffort, RunLevel, RunMode } from '../../shared/contracts';
import { usePopover } from '../usePopover';
import { Icon } from './Icon';
import { LevelControl, levelHint, levelLabel, useRovingRadioGroup } from './LevelControl';
import { VariationsControl } from './VariationsControl';

export type ComposerMode = RunMode | 'plan';

interface ModeSetting {
  value: ComposerMode;
  onChange: (mode: ComposerMode) => void;
}

export interface DesignsSetting {
  value: number;
  max: number;
  onChange: (count: number) => void;
  disabledReason: string | null;
}

export interface EffortSetting {
  value: RunEffort | null;
  onChange: (effort: RunEffort | null) => void;
}

const EFFORTS = ['auto', 'low', 'medium', 'high'] as const;
type EffortChoice = (typeof EFFORTS)[number];
export const EFFORT_LABEL: Record<EffortChoice, string> = { auto: 'Auto', low: 'Low', medium: 'Medium', high: 'High' };
export const EFFORT_HINT: Record<EffortChoice, string> = {
  auto: 'The model picks how hard to think.',
  low: 'Fastest and cheapest. Good for small changes.',
  medium: 'A balance of speed and care.',
  high: 'Thinks the longest. Best for large or tricky work.',
};

export function EffortToggle({ effort, hintId }: { effort: EffortSetting; hintId: string }) {
  const choice: EffortChoice = effort.value ?? 'auto';
  const pick = (next: EffortChoice) => effort.onChange(next === 'auto' ? null : next);
  const radios = useRovingRadioGroup(EFFORTS, choice, pick);
  return (
    <div className="segmented" role="radiogroup" aria-label="Effort" aria-describedby={hintId} onKeyDown={radios.onKeyDown}>
      {EFFORTS.map((e) => (
        <button key={e} {...radios.item(e)} type="button" role="radio" aria-checked={choice === e} className={choice === e ? 'on' : ''} onClick={() => pick(e)}>
          {EFFORT_LABEL[e]}
        </button>
      ))}
    </div>
  );
}

interface Props {
  effort?: EffortSetting;
  mode?: ModeSetting;
  level: RunLevel;
  onLevel: (level: RunLevel) => void;
  designs?: DesignsSetting;
  onOpen?: () => void;
}

const MODES = ['edit', 'plan', 'critique'] as const;
export const MODE_LABEL: Record<ComposerMode, string> = { edit: 'Edit', plan: 'Plan', critique: 'Critique' };
export const MODE_HINT: Record<ComposerMode, string> = {
  edit: 'Send changes the design.',
  plan: 'Send makes a plan first. Files change only after you approve it.',
  critique: 'Send asks for a review. The design does not change.',
};
const GAP = 4;
const MARGIN = 8;
export const UNPLACED: CSSProperties = { top: 0, left: 0, opacity: 0, pointerEvents: 'none' };

export function runSettingsSummary(input: { mode?: ComposerMode; level: RunLevel; designs?: number; designsOn?: boolean; effort?: RunEffort | null }): string {
  const parts = [input.mode ? MODE_LABEL[input.mode] : null, levelLabel(input.level), input.effort ? `${EFFORT_LABEL[input.effort]} effort` : null];
  if (input.designsOn !== false && input.designs !== undefined && input.designs > 1) parts.push(`${input.designs} designs`);
  return parts.filter(Boolean).join(' · ');
}

export function designsHint(designs: DesignsSetting): string {
  if (designs.disabledReason) return designs.disabledReason;
  if (designs.value > 1) return `Send makes ${designs.value} designs side by side.`;
  return `Pick 2 to ${designs.max} to compare options.`;
}

export function placeAboveOrBelow(trigger: HTMLElement, panel: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const left = Math.min(Math.max(MARGIN, rect.left), window.innerWidth - panel.offsetWidth - MARGIN);
  const roomAbove = rect.top - GAP - MARGIN;
  const roomBelow = window.innerHeight - rect.bottom - GAP - MARGIN;
  const fitsAbove = roomAbove >= panel.offsetHeight || roomAbove >= roomBelow;
  return fitsAbove ? { left, bottom: window.innerHeight - rect.top + GAP } : { left, top: rect.bottom + GAP };
}

function ModeToggle({ mode, hintId }: { mode: ModeSetting; hintId: string }) {
  const radios = useRovingRadioGroup(MODES, mode.value, mode.onChange);
  return (
    <div className="segmented" role="radiogroup" aria-label="Run mode" aria-describedby={hintId} onKeyDown={radios.onKeyDown}>
      {MODES.map((m) => (
        <button key={m} {...radios.item(m)} type="button" role="radio" aria-checked={mode.value === m} className={mode.value === m ? 'on' : ''} onClick={() => mode.onChange(m)}>
          {MODE_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

function tabStops(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>('[tabindex="0"]:not(:disabled)'));
}

export function RunSettings({ mode, level, onLevel, designs, onOpen, effort }: Props) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>(UNPLACED);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const designsOn = designs ? designs.disabledReason === null : false;
  const summary = runSettingsSummary({ mode: mode?.value, level, designs: designs?.value, designsOn, effort: effort?.value ?? null });

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setStyle(UNPLACED);
    if (refocus) trigger.current?.focus();
  }, []);
  usePopover(open, panel, close, trigger);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      if (trigger.current && panel.current) setStyle(placeAboveOrBelow(trigger.current, panel.current));
    };
    place();
    window.addEventListener('resize', place);
    const observer = new ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    if (trigger.current) observer.observe(trigger.current);
    return () => {
      window.removeEventListener('resize', place);
      observer.disconnect();
    };
  }, [open]);

  useEffect(() => {
    if (open && panel.current) tabStops(panel.current)[0]?.focus();
  }, [open]);

  const onPanelKey = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !panel.current) return;
    const stops = tabStops(panel.current);
    const leavingStart = event.shiftKey && document.activeElement === stops[0];
    const leavingEnd = !event.shiftKey && document.activeElement === stops[stops.length - 1];
    if (!leavingStart && !leavingEnd) return;
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
        data-tip="Run settings"
        data-tip-side="top"
        data-tip-align="start"
        onClick={() => {
          if (open) return close(false);
          onOpen?.();
          setOpen(true);
        }}
      >
        <span className="run-settings-summary">{summary}</span>
        <Icon name="chevronDown" size={12} />
      </button>
      {open &&
        createPortal(
          <div className="run-settings-pop" ref={panel} style={style} role="dialog" aria-label="Run settings" data-testid="run-settings-popover" onKeyDown={onPanelKey}>
            {mode && (
              <section className="rs-group">
                <h3 className="rs-label">Mode</h3>
                <ModeToggle mode={mode} hintId={`${id}-mode-hint`} />
                <p className="rs-hint" id={`${id}-mode-hint`}>
                  {MODE_HINT[mode.value]}
                </p>
              </section>
            )}
            <section className="rs-group">
              <h3 className="rs-label">Level</h3>
              <LevelControl value={level} onChange={onLevel} />
              <p className="rs-hint">{levelHint(level)}</p>
            </section>
            {effort && (
              <section className="rs-group">
                <h3 className="rs-label">Effort</h3>
                <EffortToggle effort={effort} hintId={`${id}-effort-hint`} />
                <p className="rs-hint" id={`${id}-effort-hint`}>
                  {EFFORT_HINT[effort.value ?? 'auto']}
                </p>
              </section>
            )}
            {designs && (
              <section className="rs-group">
                <h3 className="rs-label" id={`${id}-designs`}>
                  Designs
                </h3>
                <VariationsControl value={designs.value} max={designs.max} onChange={designs.onChange} disabled={designs.disabledReason !== null} labelledBy={`${id}-designs`} />
                <p className="rs-hint">{designsHint(designs)}</p>
              </section>
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}
