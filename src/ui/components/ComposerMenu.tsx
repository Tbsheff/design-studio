import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { RUN_LEVELS, type RunLevel } from '../../shared/contracts';
import { LEVEL_PRESETS } from '../../shared/run-levels';
import { MODEL_OPTIONS, modelLabel } from '../settingsDraft';
import { usePopover } from '../usePopover';
import { usePresence } from '../usePresence';
import { Icon, type IconName } from './Icon';
import { levelHint, levelLabel, levelShortHint, useRovingRadioGroup } from './LevelControl';
import { EFFORT_HINT, EFFORT_LABEL, EffortToggle, MODE_LABEL, UNPLACED, designsHint, placeAboveOrBelow, type ComposerMode, type DesignsSetting, type EffortSetting } from './RunSettings';

function usePlacedPopover(trigger: RefObject<HTMLButtonElement | null>, panel: RefObject<HTMLDivElement | null>) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>(UNPLACED);
  const presence = usePresence(open ? true : null);
  const close = useCallback(
    (refocus: boolean) => {
      setOpen(false);
      if (refocus) trigger.current?.focus();
    },
    [trigger],
  );
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
    return () => {
      window.removeEventListener('resize', place);
      observer.disconnect();
    };
  }, [open, trigger, panel]);
  const show = () => {
    setStyle(UNPLACED);
    setOpen(true);
  };
  return { open, shown: presence.shown !== null, closing: presence.closing, style, close, toggle: () => (open ? close(false) : show()) };
}

function panelProps(menu: { closing: boolean; style: CSSProperties }) {
  return { style: menu.style, 'data-closing': menu.closing || undefined, inert: menu.closing || undefined };
}

const ITEM = '[role^="menuitem"]:not([aria-disabled="true"])';

function menuKeys(event: KeyboardEvent<HTMLDivElement>, close: (refocus: boolean) => void) {
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(ITEM));
  const at = items.indexOf(document.activeElement as HTMLElement);
  const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
  if (step !== 0) {
    event.preventDefault();
    items[(at + step + items.length) % items.length]?.focus();
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
  } else if (event.key === 'Tab') {
    event.preventDefault();
    close(true);
  }
}

interface ItemProps {
  icon?: IconName;
  label: string;
  meta?: string;
  checked?: boolean;
  disabledReason?: string | null;
  hint?: string;
  onPick: () => void;
}

function MenuItem({ icon, label, meta, checked, disabledReason, hint, onPick }: ItemProps) {
  const off = Boolean(disabledReason);
  const note = disabledReason ?? hint;
  return (
    <button
      type="button"
      className={note ? 'ui-menu-item has-hint' : 'ui-menu-item'}
      role={checked === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={checked}
      aria-disabled={off || undefined}
      tabIndex={-1}
      onClick={() => {
        if (!off) onPick();
      }}
    >
      {icon && <Icon name={icon} size={14} />}
      <span>{label}</span>
      {note && <span className="ui-menu-hint">{note}</span>}
      {meta && <span className="ui-menu-meta">{meta}</span>}
    </button>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="ui-menu-section" role="group" aria-labelledby={id}>
      <span className="ui-menu-label" id={id}>
        {label}
      </span>
      {children}
    </div>
  );
}

interface PlusMenuProps {
  onAttach: () => void;
  onMention: () => void;
  onSkills: () => void;
  onOpen?: () => void;
  mode: ComposerMode;
  onMode: (mode: ComposerMode) => void;
  designs?: DesignsSetting | undefined;
}

const MODES: readonly ComposerMode[] = ['edit', 'plan', 'critique'];
const MODE_SHORT_HINT: Record<ComposerMode, string> = { edit: 'Changes the design', plan: 'Plan first, then you approve', critique: 'Review only, no changes' };
const DESIGN_COUNTS = [1, 2, 3, 4] as const;

export function PlusMenu(props: PlusMenuProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menu = usePlacedPopover(trigger, panel);
  useEffect(() => {
    if (menu.open) panel.current?.querySelector<HTMLElement>(ITEM)?.focus();
  }, [menu.open]);
  const act = (run: () => void) => () => {
    menu.close(false);
    run();
  };
  const designs = props.designs;
  const countsId = useId();
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="icon-btn small bordered composer-plus"
        aria-label="Add and settings"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        data-testid="composer-plus"
        data-tip="Attach, mention, skills and run settings"
        data-tip-side="top"
        data-tip-align="start"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => {
          if (!menu.open) props.onOpen?.();
          menu.toggle();
        }}
      >
        <Icon name="plus" size={16} />
      </button>
      {menu.shown &&
        createPortal(
          <div ref={panel} className="ui-menu composer-menu" role="menu" aria-label="Add and settings" {...panelProps(menu)} onKeyDown={(event) => menuKeys(event, menu.close)}>
            <Section label="Add">
              <MenuItem icon="paperclip" label="Attach image" onPick={act(props.onAttach)} />
              <MenuItem icon="file" label="Mention a file or token" meta="@" onPick={act(props.onMention)} />
              <MenuItem icon="book" label="Skills and commands" meta="/" onPick={act(props.onSkills)} />
            </Section>
            <Section label="Mode">
              {MODES.map((mode) => (
                <MenuItem key={mode} label={MODE_LABEL[mode]} hint={MODE_SHORT_HINT[mode]} checked={props.mode === mode} onPick={() => props.onMode(mode)} />
              ))}
            </Section>
            {designs && (
              <Section label="Designs side by side">
                <div className="composer-menu-counts" aria-describedby={`${countsId}-hint`}>
                  {DESIGN_COUNTS.filter((count) => count <= designs.max).map((count) => {
                    const off = count > 1 && designs.disabledReason !== null;
                    return (
                      <button
                        key={count}
                        type="button"
                        role="menuitemradio"
                        className="composer-menu-count"
                        aria-label={count === 1 ? '1 design' : `${count} designs`}
                        aria-checked={designs.value === count}
                        aria-disabled={off || undefined}
                        tabIndex={-1}
                        onClick={() => {
                          if (!off) designs.onChange(count);
                        }}
                      >
                        {count}
                      </button>
                    );
                  })}
                </div>
                <p className="ui-menu-hint composer-menu-counts-hint" id={`${countsId}-hint`}>
                  {designsHint(designs)}
                </p>
              </Section>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

function PillCaret() {
  return (
    <svg className="ui-pill-select-caret" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <path d="M3.5 6L8 10.5 12.5 6" />
    </svg>
  );
}

function ModelName({ name }: { name: string }) {
  const at = name.lastIndexOf(' ');
  if (at < 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, at)}
      <span className="model-pill-version"> {name.slice(at + 1)}</span>
    </>
  );
}

export function LevelPill({ level, onLevel, onOpen }: { level: RunLevel; onLevel: (level: RunLevel) => void; onOpen?: () => void }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menu = usePlacedPopover(trigger, panel);
  useEffect(() => {
    if (menu.open) (panel.current?.querySelector<HTMLElement>('[aria-checked="true"]') ?? panel.current?.querySelector<HTMLElement>(ITEM))?.focus();
  }, [menu.open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="ui-pill-select composer-pill"
        data-testid="level-pill"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={`Level: ${levelLabel(level)}`}
        onClick={() => {
          if (!menu.open) onOpen?.();
          menu.toggle();
        }}
      >
        <span className="ui-pill-select-label">Level</span>
        <span className="ui-pill-select-value">{levelLabel(level)}</span>
        <PillCaret />
      </button>
      {menu.shown &&
        createPortal(
          <div ref={panel} className="ui-menu composer-menu level-menu" role="menu" aria-label="Level" {...panelProps(menu)} onKeyDown={(event) => menuKeys(event, menu.close)}>
            <Section label="Level">
              {RUN_LEVELS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="menuitemradio"
                  className="ui-menu-item has-hint level-menu-item"
                  aria-checked={level === item}
                  tabIndex={-1}
                  onClick={() => {
                    onLevel(item);
                    menu.close(true);
                  }}
                >
                  <span>{levelLabel(item)}</span>
                  <span className="ui-menu-hint">{levelShortHint(item)}</span>
                </button>
              ))}
            </Section>
          </div>,
          document.body,
        )}
    </>
  );
}

export function effectiveModel(model: string, level: RunLevel): string {
  const preset = LEVEL_PRESETS[level].model;
  return preset === 'project' ? model : preset;
}

function shortModel(id: string): string {
  return modelLabel(id).replace(/^Claude /, '');
}

function ModelToggle({ value, onChange, locked }: { value: string; onChange: (id: string) => void; locked: boolean }) {
  const ids = MODEL_OPTIONS.map((option) => option.id);
  const known = ids.includes(value);
  const radios = useRovingRadioGroup<string>(ids, known ? value : (ids[0] ?? ''), onChange, () => locked);
  return (
    <div className="segmented" role="radiogroup" aria-label="Model" onKeyDown={radios.onKeyDown}>
      {MODEL_OPTIONS.map((option) => (
        <button key={option.id} {...radios.item(option.id)} type="button" role="radio" aria-checked={value === option.id} disabled={locked} className={value === option.id ? 'on' : ''} onClick={() => onChange(option.id)}>
          {shortModel(option.id)}
        </button>
      ))}
    </div>
  );
}

interface ModelPillProps {
  model: string;
  level: RunLevel;
  effort: EffortSetting;
  onModel: (id: string) => void;
  onOpen?: () => void;
}

export function ModelPill({ model, level, effort, onModel, onOpen }: ModelPillProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pop = usePlacedPopover(trigger, panel);
  const id = useId();
  const shown = effectiveModel(model, level);
  const locked = shown !== model;
  const choice = effort.value ?? 'auto';
  useEffect(() => {
    if (pop.open) panel.current?.querySelector<HTMLElement>('[tabindex="0"]:not(:disabled)')?.focus();
  }, [pop.open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="ui-pill-select composer-pill model-pill"
        data-testid="run-settings"
        aria-label={`Model: ${shortModel(shown)}`}
        aria-haspopup="dialog"
        aria-expanded={pop.open}
        onClick={() => {
          if (!pop.open) onOpen?.();
          pop.toggle();
        }}
      >
        <span className="ui-pill-select-label">Model</span>
        <span className="ui-pill-select-value model-pill-name" data-testid="active-model">
          <ModelName name={shortModel(shown)} />
        </span>
        <PillCaret />
      </button>
      {pop.shown &&
        createPortal(
          <div className="run-settings-pop" ref={panel} {...panelProps(pop)} role="dialog" aria-label="Model and effort" data-testid="run-settings-popover">
            <section className="rs-group">
              <h3 className="rs-label">Model</h3>
              <ModelToggle value={shown} onChange={onModel} locked={locked} />
              <p className="rs-hint">{locked ? `${levelLabel(level)} runs always use ${shortModel(shown)}. Pick another level in the Level menu to change the model.` : 'Saved for this project.'}</p>
            </section>
            <section className="rs-group">
              <h3 className="rs-label">Effort</h3>
              <EffortToggle effort={effort} hintId={`${id}-effort-hint`} />
              <p className="rs-hint" id={`${id}-effort-hint`}>
                {EFFORT_HINT[choice]}
              </p>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
