import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { uiStore, type Viewport, type ZoomSetting } from '../storage';
import { Icon, type IconName } from './Icon';
import { PenIcon } from './DrawLayer';
import { VECTOR_TOOLS, useVectorTool, vectorTool } from '../vectorTool';

export const PRESETS: { id: Viewport['preset']; label: string; icon: IconName; width: number; height: number }[] = [
  { id: 'desktop', label: 'Desktop 1440', icon: 'desktop', width: 1440, height: 900 },
  { id: 'tablet', label: 'Tablet 768', icon: 'tablet', width: 768, height: 1024 },
  { id: 'mobile', label: 'Mobile 390', icon: 'mobile', width: 390, height: 844 },
];

export type CanvasSource = { kind: 'live' } | { kind: 'last' } | { kind: 'version'; versionId: string; title: string };

interface Props {
  viewport: Viewport;
  drawMode?: boolean;
  onToggleDraw?: () => void;
  source: CanvasSource;
  onSource: (s: CanvasSource) => void;
  hasHead: boolean;
  checking: boolean;
  onCheck: () => void;
  addFrame?: ReactNode;
  theme?: { dark: boolean; onToggle: () => void };
  lofi?: { on: boolean; onToggle: () => void };
  links?: { on: boolean; onToggle: () => void };
  rulers?: { on: boolean; onToggle: () => void };
}

const RADIO_STEP: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowDown: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
};

function onRadioGroupKey(event: KeyboardEvent<HTMLDivElement>) {
  const step = RADIO_STEP[event.key];
  if (!step) return;
  const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'));
  const index = radios.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  const next = radios[step(index, radios.length)];
  next?.focus();
  next?.click();
}

function ViewportControls({ viewport }: { viewport: Viewport }) {
  const [customW, setCustomW] = useState(String(viewport.width));
  const [customH, setCustomH] = useState(String(viewport.height));
  const [shown, setShown] = useState(`${viewport.width}x${viewport.height}`);
  if (shown !== `${viewport.width}x${viewport.height}`) {
    setShown(`${viewport.width}x${viewport.height}`);
    setCustomW(String(viewport.width));
    setCustomH(String(viewport.height));
  }

  const applyCustom = () => {
    const w = Math.max(200, Math.min(4000, Number.parseInt(customW, 10) || viewport.width));
    const h = Math.max(200, Math.min(4000, Number.parseInt(customH, 10) || viewport.height));
    setCustomW(String(w));
    setCustomH(String(h));
    uiStore.set({ viewport: { preset: 'custom', width: w, height: h } });
  };

  const onDimKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    applyCustom();
  };

  return (
    <div className="toolbar-group">
      <div className="segmented icons" role="radiogroup" aria-label="Viewport" onKeyDown={onRadioGroupKey}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-label={p.label}
            data-tip={p.label}
            data-tip-align={p.id === 'desktop' ? 'start' : undefined}
            aria-checked={viewport.preset === p.id}
            tabIndex={viewport.preset === p.id ? 0 : -1}
            className={viewport.preset === p.id ? 'on' : ''}
            onClick={() => uiStore.set({ viewport: { preset: p.id, width: p.width, height: p.height } })}
          >
            <Icon name={p.icon} />
          </button>
        ))}
        <button
          role="radio"
          aria-label="Custom"
          data-tip="Custom size"
          aria-checked={viewport.preset === 'custom'}
          tabIndex={viewport.preset === 'custom' ? 0 : -1}
          className={viewport.preset === 'custom' ? 'on' : ''}
          onClick={applyCustom}
        >
          <Icon name="custom" />
        </button>
      </div>
      {viewport.preset === 'custom' ? (
        <form
          className="dims"
          onSubmit={(e) => {
            e.preventDefault();
            applyCustom();
          }}
        >
          <input aria-label="Width" value={customW} onChange={(e) => setCustomW(e.target.value)} onBlur={applyCustom} onKeyDown={onDimKey} />
          <span className="x">×</span>
          <input aria-label="Height" value={customH} onChange={(e) => setCustomH(e.target.value)} onBlur={applyCustom} onKeyDown={onDimKey} />
        </form>
      ) : (
        <span className="dims-readout">
          {viewport.width} × {viewport.height}
        </span>
      )}
    </div>
  );
}

function SourceControls({ source, onSource, hasHead }: Pick<Props, 'source' | 'onSource' | 'hasHead'>) {
  return (
    <div className="toolbar-group source">
      <div className="segmented source-seg" role="radiogroup" aria-label="Preview source" onKeyDown={onRadioGroupKey}>
        <button
          role="radio"
          aria-checked={source.kind === 'live'}
          tabIndex={source.kind === 'last' ? -1 : 0}
          className={source.kind === 'live' ? 'on' : ''}
          aria-label="Live"
          data-tip="Live preview"
          onClick={() => onSource({ kind: 'live' })}
        >
          <Icon name="radio" className="seg-icon" />
          <span className="seg-label">Live</span>
        </button>
        <button
          role="radio"
          aria-checked={source.kind === 'last'}
          tabIndex={source.kind === 'last' ? 0 : -1}
          className={source.kind === 'last' ? 'on' : ''}
          disabled={!hasHead}
          aria-label="Last completed"
          data-tip="Last completed version"
          onClick={() => onSource({ kind: 'last' })}
        >
          <Icon name="history" className="seg-icon" />
          <span className="seg-label">Last completed</span>
        </button>
      </div>
      {source.kind === 'version' && (
        <span className="pill">
          <Icon name="eye" size={14} />
          <span className="pill-text">Viewing {source.title}</span>
          <button className="link" onClick={() => onSource({ kind: 'live' })}>
            Back to live
          </button>
        </span>
      )}
    </div>
  );
}

export function zoomOptionLabel(setting: ZoomSetting, zoom: number): string {
  return setting === 'fit' ? `Fit ${Math.round(zoom * 100)}%` : 'Fit';
}

function ThemeSwitch({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="icon-btn theme-switch"
      aria-label="Preview dark mode"
      aria-pressed={dark}
      data-tip={dark ? 'Back to the default mode' : 'Preview dark mode'}
      onClick={onToggle}
    >
      <Icon name="moon" />
    </button>
  );
}

function LofiSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="btn small ghost select-toggle lofi-toggle"
      aria-pressed={on}
      data-tip={on ? 'Show the real colors and fonts' : 'Show this direction in grayscale with a hand-drawn font. Your files do not change.'}
      onClick={onToggle}
    >
      <Icon name="pencil" size={14} />
      <span className="label">Lo-fi look</span>
    </button>
  );
}

function LinksSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="btn small ghost select-toggle links-toggle" aria-pressed={on} data-tip={on ? 'Hide the link arrows' : 'Show the link arrows'} onClick={onToggle}>
      <Icon name="link" size={14} />
      <span className="label">Link arrows</span>
    </button>
  );
}

function RulersSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="btn small ghost select-toggle rulers-toggle" aria-pressed={on} aria-keyshortcuts="Shift+R" data-tip={on ? 'Hide rulers' : 'Show rulers'} onClick={onToggle}>
      <svg className="icon" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M2.5 2.5h11v4h-11zM5 2.5v2M8 2.5v2M11 2.5v2M2.5 6.5v7h4v-7M2.5 9h2M2.5 11.5h2" />
      </svg>
      <span className="label">Rulers</span> <kbd>⇧R</kbd>
    </button>
  );
}

export function VectorToolButtons() {
  const { tool, available } = useVectorTool();
  return (
    <div className="ui-tools topbar-tools vector-tools" role="group" aria-label="Shape tools">
      {VECTOR_TOOLS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.label}
          aria-pressed={available && tool === item.id}
          disabled={!available}
          aria-keyshortcuts={item.id === 'pen' ? 'Shift+P' : item.keyLabel}
          data-tip={`${item.label} ${item.keyLabel}`}
          onClick={() => vectorTool.toggle(item.id)}
        >
          <svg className="icon" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d={item.glyph} />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function CanvasViewRow(props: Props) {
  return (
    <div className="toolbar canvas-viewrow" role="toolbar" aria-label="View options">
      <ViewportControls viewport={props.viewport} />
      {props.addFrame}
      {props.theme && <ThemeSwitch dark={props.theme.dark} onToggle={props.theme.onToggle} />}
      {props.lofi && <LofiSwitch on={props.lofi.on} onToggle={props.lofi.onToggle} />}
      {props.links && <LinksSwitch on={props.links.on} onToggle={props.links.onToggle} />}
      {props.rulers && <RulersSwitch on={props.rulers.on} onToggle={props.rulers.onToggle} />}
      <div className="toolbar-sep" />
      <SourceControls source={props.source} onSource={props.onSource} hasHead={props.hasHead} />
      <div className="spacer" />
      {props.drawMode !== undefined && (
        <button
          className="btn small ghost select-toggle draw-toggle"
          aria-pressed={props.drawMode}
          aria-label="Draw"
          aria-keyshortcuts="P"
          data-tip="Draw on the design, then add a comment. Esc exits."
          data-tip-align="end"
          onClick={props.onToggleDraw}
        >
          <PenIcon size={14} />
          <span className="label">Draw</span> <kbd>P</kbd>
        </button>
      )}
      <button
        className="icon-btn small"
        aria-label={props.checking ? 'Checking…' : 'Check render'}
        data-tip={props.checking ? 'Checking render…' : 'Check render'}
        data-tip-align="end"
        onClick={props.onCheck}
        disabled={props.checking}
      >
        {props.checking ? <span className="spinner" /> : <Icon name="scan" size={14} />}
      </button>
    </div>
  );
}
