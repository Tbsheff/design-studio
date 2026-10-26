import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import type { PackSummary, RunLevel } from '../../shared/contracts';
import { fontStack, loadPackFonts, type PacksState } from '../packs';
import { MODEL_OPTIONS } from '../settingsDraft';
import { usePopover } from '../usePopover';
import { Icon } from './Icon';
import { LevelControl, levelHint } from './LevelControl';
import { VariationsControl } from './VariationsControl';

type Close = (refocus: boolean) => void;

const FOCUS_ITEMS = '.ui-menu-item:not(:disabled), .home-pack-card:not(:disabled), .btn:not(:disabled)';

function moveFocus(event: KeyboardEvent<HTMLElement>, selector: string) {
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>(selector)];
  const at = items.indexOf(document.activeElement as HTMLElement);
  const next = event.key === 'ArrowDown' ? at + 1 : event.key === 'ArrowUp' ? at - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null;
  if (next === null || items.length === 0) return;
  event.preventDefault();
  items[(next + items.length) % items.length]?.focus();
}

function Pop({ trigger, onClose, className, label, role = 'dialog', children, onKeyDown }: { trigger: RefObject<HTMLElement | null>; onClose: Close; className: string; label: string; role?: 'dialog' | 'menu'; children: ReactNode; onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void }) {
  const root = useRef<HTMLDivElement>(null);
  usePopover(true, root, onClose, trigger);
  useEffect(() => {
    const first = root.current?.querySelector<HTMLElement>('[aria-checked="true"], [aria-pressed="true"]') ?? root.current?.querySelector<HTMLElement>(FOCUS_ITEMS);
    first?.focus();
  }, []);
  return (
    <div
      ref={root}
      className={`ui-popover home-pop ${className}`}
      role={role}
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === 'Tab' && role === 'menu') {
          event.preventDefault();
          onClose(true);
        }
        onKeyDown?.(event);
      }}
    >
      {children}
    </div>
  );
}

export interface PlusMenuActions {
  onAttachFile: () => void;
  onAttachFolder: () => void;
  onLinkCode: () => void;
  onImportSystem: () => void;
  onDesignSystem: () => void;
  onSkills: () => void;
  onLocation: () => void;
}

function Item({ icon, label, meta, onClick }: { icon: Parameters<typeof Icon>[0]['name']; label: string; meta?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" className="ui-menu-item" tabIndex={-1} onClick={onClick}>
      <Icon name={icon} size={14} />
      <span className="truncate">{label}</span>
      {meta && <span className="ui-menu-meta">{meta}</span>}
    </button>
  );
}

export function PlusMenu({ trigger, onClose, actions, locationLabel }: { trigger: RefObject<HTMLElement | null>; onClose: Close; actions: PlusMenuActions; locationLabel: string }) {
  const run = (action: () => void) => () => {
    onClose(false);
    action();
  };
  return (
    <Pop trigger={trigger} onClose={onClose} className="ui-menu home-plus-menu" label="Add to the project" role="menu" onKeyDown={(event) => moveFocus(event, '.ui-menu-item')}>
      <div className="ui-menu-section">
        <span className="ui-menu-label">Files</span>
        <Item icon="paperclip" label="Attach images" meta="⌘V" onClick={run(actions.onAttachFile)} />
        <Item icon="folder" label="Open a folder…" onClick={run(actions.onAttachFolder)} />
      </div>
      <div className="ui-menu-section">
        <span className="ui-menu-label">Code</span>
        <Item icon="terminal" label="Link local code…" onClick={run(actions.onLinkCode)} />
      </div>
      <div className="ui-menu-section">
        <span className="ui-menu-label">Designs</span>
        <Item icon="download" label="Import design system or tokens" onClick={run(actions.onImportSystem)} />
      </div>
      <div className="ui-menu-section">
        <Item icon="palette" label="Design system" meta={<Icon name="chevronRight" size={12} />} onClick={run(actions.onDesignSystem)} />
        <Item icon="sparkle" label="Skills and limits" onClick={run(actions.onSkills)} />
        <Item icon="folder" label="Location" meta={locationLabel} onClick={run(actions.onLocation)} />
      </div>
    </Pop>
  );
}

function swatch(pack: PackSummary, name: string, fallback: string): string {
  return pack.swatches.find((item) => item.name === name)?.value ?? fallback;
}

const RAMP = [6, 16, 30, 48, 68, 100, 72, 48];

function packVars(pack: PackSummary): CSSProperties {
  return {
    '--pc-bg': swatch(pack, 'bg', '#fff'),
    '--pc-surface': swatch(pack, 'surface', '#f5f5f5'),
    '--pc-fg': swatch(pack, 'fg', '#111'),
    '--pc-primary': swatch(pack, 'primary', '#555'),
    '--pc-accent': swatch(pack, 'accent', '#888'),
    '--pc-border': swatch(pack, 'border', '#ddd'),
    '--pc-display': fontStack(pack.fonts.display, 'var(--serif)'),
    '--pc-body': fontStack(pack.fonts.body, 'var(--font)'),
  } as CSSProperties;
}

function rampColor(step: number, index: number): string {
  return index <= 5 ? `color-mix(in oklch, var(--pc-primary) ${step}%, var(--pc-bg))` : `color-mix(in oklch, var(--pc-primary) ${step}%, var(--pc-fg))`;
}

function fontNames(pack: PackSummary): string {
  const clean = (family: string) => family.split(',')[0]?.replace(/['"]/g, '').trim() ?? '';
  const display = clean(pack.fonts.display);
  const body = clean(pack.fonts.body);
  return display === body || !body ? display : `${display} / ${body}`;
}

export function PackPreviewCard({ pack, selected, onPick }: { pack: PackSummary; selected: boolean; onPick: () => void }) {
  return (
    <button type="button" className="home-pack-card" aria-pressed={selected} data-pack-id={pack.id} onClick={onPick}>
      <span className="home-pack-face" style={packVars(pack)} aria-hidden="true">
        <span className="pc-fonts">{fontNames(pack)}</span>
        <span className="pc-name">{pack.name}</span>
        <span className="pc-ramp">
          {RAMP.map((step, index) => (
            <span key={index} style={{ background: rampColor(step, index) }} />
          ))}
        </span>
        <span className="pc-sample">
          <span className="pc-sample-card">
            <span className="pc-sample-text">The quick brown fox jumps over the lazy dog.</span>
            <span className="pc-btn">Continue →</span>
          </span>
          <span className="pc-image" />
        </span>
      </span>
      <span className="home-pack-label truncate">{pack.name}</span>
    </button>
  );
}

function NoneCard({ selected, onPick }: { selected: boolean; onPick: () => void }) {
  return (
    <button type="button" className="home-pack-card none" aria-pressed={selected} onClick={onPick}>
      <span className="home-pack-face none" aria-hidden="true">
        <span className="pc-none-text">No design system</span>
        <span className="pc-none-hint">The agent picks the look</span>
      </span>
      <span className="home-pack-label">None</span>
    </button>
  );
}

export function PackCards({ packs, value, includeNone, onPick }: { packs: PackSummary[]; value: string | null; includeNone: boolean; onPick: (pack: PackSummary | null) => void }) {
  useEffect(() => loadPackFonts(packs), [packs]);
  return (
    <div className="home-pack-grid">
      {includeNone && <NoneCard selected={value === null} onPick={() => onPick(null)} />}
      {packs.map((pack) => (
        <PackPreviewCard key={pack.id} pack={pack} selected={pack.id === value} onPick={() => onPick(pack)} />
      ))}
    </div>
  );
}

export function PackPopover({ trigger, onClose, state, value, onChange, onNew }: { trigger: RefObject<HTMLElement | null>; onClose: Close; state: PacksState; value: string | null; onChange: (id: string | null) => void; onNew: () => void }) {
  return (
    <Pop trigger={trigger} onClose={onClose} className="home-pack-pop" label="Design system" onKeyDown={(event) => moveFocus(event, FOCUS_ITEMS)}>
      <p className="home-pop-lede">Set up a design system so every project starts from your colors, type and components.</p>
      <button type="button" className="btn strong home-pop-cta" onClick={onNew}>
        Set up your design system
      </button>
      {state.error && <div className="alert error small">Could not load design systems. {state.error}</div>}
      <PackCards
        packs={state.packs ?? []}
        value={value}
        includeNone
        onPick={(pack) => {
          onChange(pack?.id ?? null);
          onClose(true);
        }}
      />
    </Pop>
  );
}

export interface ModelSettings {
  model: string;
  onModel: (model: string) => void;
  level: RunLevel;
  onLevel: (level: RunLevel) => void;
  designs: { value: number; max: number; onChange: (count: number) => void };
  onMore: () => void;
}

export function ModelPopover({ trigger, onClose, settings }: { trigger: RefObject<HTMLElement | null>; onClose: Close; settings: ModelSettings }) {
  const { designs } = settings;
  return (
    <Pop trigger={trigger} onClose={onClose} className="home-model-pop" label="Model and run settings">
      <div className="ui-menu-section" role="radiogroup" aria-label="Model" onKeyDown={(event) => moveFocus(event, '.ui-menu-item')}>
        <span className="ui-menu-label">Model</span>
        {MODEL_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            className="ui-menu-item"
            aria-checked={settings.model === option.id}
            tabIndex={settings.model === option.id ? 0 : -1}
            onClick={() => settings.onModel(option.id)}
          >
            {option.label.replace(/^Claude /, '')}
          </button>
        ))}
      </div>
      <div className="ui-menu-section home-pop-group">
        <span className="ui-menu-label">Level</span>
        <LevelControl value={settings.level} onChange={settings.onLevel} tipSide="bottom" />
        <p className="home-pop-hint">{levelHint(settings.level)}</p>
      </div>
      <div className="ui-menu-section home-pop-group">
        <span className="ui-menu-label" id="home-designs-label">
          Designs
        </span>
        <VariationsControl value={designs.value} max={designs.max} onChange={designs.onChange} labelledBy="home-designs-label" />
        <p className="home-pop-hint">{designs.value > 1 ? `Create makes ${designs.value} designs side by side.` : `Pick 2 to ${designs.max} to compare options.`}</p>
      </div>
      <div className="ui-menu-section">
        <button
          type="button"
          className="ui-menu-item"
          onClick={() => {
            onClose(false);
            settings.onMore();
          }}
        >
          <Icon name="sliders" size={14} />
          Skills, limits and DESIGN.md…
        </button>
      </div>
    </Pop>
  );
}
