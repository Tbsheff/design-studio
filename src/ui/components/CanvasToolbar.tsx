import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { uiStore, type Viewport, type ZoomSetting } from '../storage';
import { Icon, type IconName } from './Icon';
import { PenIcon } from './DrawLayer';
import { shortcutLabel, type KeyId } from '../../shared/keymap';
import { IS_MAC, tipWithKey } from '../commands/keys';

export const PRESETS: { id: Viewport['preset']; label: string; icon: IconName; width: number; height: number }[] = [
  { id: 'desktop', label: 'Desktop 1440', icon: 'desktop', width: 1440, height: 900 },
  { id: 'tablet', label: 'Tablet 768', icon: 'tablet', width: 768, height: 1024 },
  { id: 'mobile', label: 'Mobile 390', icon: 'mobile', width: 390, height: 844 },
];

const ZOOMS = [0.5, 0.75, 1, 1.25];

export type CanvasSource = { kind: 'live' } | { kind: 'last' } | { kind: 'version'; versionId: string; title: string };

interface Props {
  viewport: Viewport;
  zoomSetting: ZoomSetting;
  zoom: number;
  onZoomTo: (z: number) => void;
  onZoomStep: (direction: 1 | -1) => void;
  onFit: () => void;
  selectMode: boolean;
  onToggleSelect: () => void;
  commentMode?: boolean;
  onToggleComment?: () => void;
  drawMode?: boolean;
  onToggleDraw?: () => void;
  source: CanvasSource;
  onSource: (s: CanvasSource) => void;
  hasHead: boolean;
  checking: boolean;
  onCheck: () => void;
  addFrame?: ReactNode;
  layers?: ReactNode;
  theme?: { dark: boolean; onToggle: () => void };
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

const keyOf = (id: KeyId) => shortcutLabel(id, IS_MAC);
const ZOOM_TIP = `Fit ${keyOf('zoom-fit')}  ·  Selection ${keyOf('zoom-selection')}  ·  100% ${keyOf('zoom-actual')}`;

type ZoomControlProps = Pick<Props, 'zoomSetting' | 'zoom' | 'onZoomTo' | 'onZoomStep' | 'onFit'>;

export function zoomOptionLabel(setting: ZoomSetting, zoom: number): string {
  return setting === 'fit' ? `Fit ${Math.round(zoom * 100)}%` : 'Fit';
}

function ZoomControls({ zoomSetting, zoom, onZoomTo, onZoomStep, onFit }: ZoomControlProps) {
  const percent = Math.round(zoom * 100);
  const custom = zoomSetting !== 'fit' && !ZOOMS.includes(zoomSetting);
  return (
    <div className="zoom-controls">
      <button className="icon-btn small" aria-label="Zoom out" aria-keyshortcuts="- Control+- Meta+-" data-tip={tipWithKey('Zoom out', 'zoom-out')} onClick={() => onZoomStep(-1)}>
        <Icon name="minus" />
      </button>
      <select
        className="select zoom-select"
        aria-label="Zoom"
        data-tip={ZOOM_TIP}
        value={zoomSetting === 'fit' ? 'fit' : String(zoomSetting)}
        onChange={(e) => (e.target.value === 'fit' ? onFit() : onZoomTo(Number(e.target.value)))}
      >
        <option value="fit">{zoomOptionLabel(zoomSetting, zoom)}</option>
        {ZOOMS.map((z) => (
          <option key={z} value={String(z)}>
            {Math.round(z * 100)}%
          </option>
        ))}
        {custom && <option value={String(zoomSetting)}>{percent}%</option>}
      </select>
      <button
        className="icon-btn small"
        aria-label="Zoom in"
        aria-keyshortcuts="= Control+= Meta+="
        data-tip={tipWithKey('Zoom in', 'zoom-in')}
        data-tip-align="end"
        onClick={() => onZoomStep(1)}
      >
        <Icon name="plus" />
      </button>
    </div>
  );
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

export function CanvasToolbar(props: Props) {
  return (
    <div className="toolbar">
      {props.layers}
      {props.layers && <div className="toolbar-sep" />}
      <ViewportControls viewport={props.viewport} />
      {props.addFrame}
      {props.theme && <ThemeSwitch dark={props.theme.dark} onToggle={props.theme.onToggle} />}
      <div className="toolbar-sep" />
      <SourceControls source={props.source} onSource={props.onSource} hasHead={props.hasHead} />
      <div className="spacer" />
      <button
        className="btn small select-toggle"
        aria-pressed={props.selectMode}
        aria-label="Select"
        aria-keyshortcuts="V"
        data-tip="Pick elements to edit. Esc exits."
        data-tip-align="end"
        onClick={props.onToggleSelect}
      >
        <Icon name="pointer" />
        <span className="label">Select</span> <kbd>V</kbd>
      </button>
      {props.commentMode !== undefined && (
        <button
          className="btn small select-toggle comment-toggle"
          aria-pressed={props.commentMode}
          aria-label="Comment"
          aria-keyshortcuts="C"
          data-tip="Pin comments on elements. Esc exits."
          data-tip-align="end"
          onClick={props.onToggleComment}
        >
          <Icon name="comment" />
          <span className="label">Comment</span> <kbd>C</kbd>
        </button>
      )}
      {props.drawMode !== undefined && (
        <button
          className="btn small select-toggle draw-toggle"
          aria-pressed={props.drawMode}
          aria-label="Draw"
          aria-keyshortcuts="P"
          data-tip="Draw on the design, then add a comment. Esc exits."
          data-tip-align="end"
          onClick={props.onToggleDraw}
        >
          <PenIcon />
          <span className="label">Draw</span> <kbd>P</kbd>
        </button>
      )}
      <ZoomControls
        zoomSetting={props.zoomSetting}
        zoom={props.zoom}
        onZoomTo={props.onZoomTo}
        onZoomStep={props.onZoomStep}
        onFit={props.onFit}
      />
      <div className="toolbar-sep" />
      <button
        className="icon-btn"
        aria-label={props.checking ? 'Checking…' : 'Check render'}
        data-tip={props.checking ? 'Checking render…' : 'Check render'}
        data-tip-align="end"
        onClick={props.onCheck}
        disabled={props.checking}
      >
        {props.checking ? <span className="spinner" /> : <Icon name="scan" />}
      </button>
    </div>
  );
}
