import { Icon } from "@design-studio/ui";
import { useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { PRESETS } from "../../domain/canvas-presets.js";
import type { CanvasSource } from "../../domain/canvas-presets.js";
import { uiStore } from "../../platform/storage.js";
import type { Viewport } from "../../platform/storage.js";
import { copy } from "./copy.js";

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
  ArrowDown: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  End: (_index, count) => count - 1,
  Home: () => 0,
};

function onRadioGroupKey(event: KeyboardEvent<HTMLDivElement>) {
  const step = RADIO_STEP[event.key];

  if (!step) {
    return;
  }

  const radios = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]:not(:disabled)'
    ),
  ];

  const index = radios.indexOf(document.activeElement as HTMLButtonElement);

  if (index === -1) {
    return;
  }

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
    const w = Math.max(
      200,
      Math.min(4000, Number.parseInt(customW, 10) || viewport.width)
    );

    const h = Math.max(
      200,
      Math.min(4000, Number.parseInt(customH, 10) || viewport.height)
    );

    setCustomW(String(w));
    setCustomH(String(h));
    uiStore.set({ viewport: { height: h, preset: "custom", width: w } });
  };

  const onDimKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") {
      return;
    }

    e.preventDefault();
    applyCustom();
  };

  return (
    <div className="toolbar-group">
      <div
        className="segmented icons"
        role="radiogroup"
        aria-label={copy.viewport}
        onKeyDown={onRadioGroupKey}
      >
        {PRESETS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-label={p.label}
            data-tip={p.label}
            data-tip-align={p.id === "desktop" ? "start" : undefined}
            aria-checked={viewport.preset === p.id}
            tabIndex={viewport.preset === p.id ? 0 : -1}
            className={viewport.preset === p.id ? "on" : ""}
            onClick={() =>
              uiStore.set({
                viewport: { height: p.height, preset: p.id, width: p.width },
              })
            }
          >
            <Icon name={p.icon} />
          </button>
        ))}
        <button
          role="radio"
          aria-label={copy.custom}
          data-tip={copy.customSize}
          aria-checked={viewport.preset === "custom"}
          tabIndex={viewport.preset === "custom" ? 0 : -1}
          className={viewport.preset === "custom" ? "on" : ""}
          onClick={applyCustom}
        >
          <Icon name="custom" />
        </button>
      </div>
      {viewport.preset === "custom" ? (
        <form
          className="dims"
          onSubmit={(e) => {
            e.preventDefault();
            applyCustom();
          }}
        >
          <input
            aria-label={copy.width}
            value={customW}
            onChange={(e) => setCustomW(e.target.value)}
            onBlur={applyCustom}
            onKeyDown={onDimKey}
          />
          <span className="x">×</span>
          <input
            aria-label={copy.height}
            value={customH}
            onChange={(e) => setCustomH(e.target.value)}
            onBlur={applyCustom}
            onKeyDown={onDimKey}
          />
        </form>
      ) : (
        <span className="dims-readout">
          {viewport.width} × {viewport.height}
        </span>
      )}
    </div>
  );
}

function SourceControls({
  source,
  onSource,
  hasHead,
}: Pick<Props, "source" | "onSource" | "hasHead">) {
  return (
    <div className="toolbar-group source">
      <div
        className="segmented source-seg"
        role="radiogroup"
        aria-label={copy.previewSource}
        onKeyDown={onRadioGroupKey}
      >
        <button
          role="radio"
          aria-checked={source.kind === "live"}
          tabIndex={source.kind === "last" ? -1 : 0}
          className={source.kind === "live" ? "on" : ""}
          aria-label={copy.live}
          data-tip={copy.livePreview}
          onClick={() => onSource({ kind: "live" })}
        >
          <Icon name="radio" className="seg-icon" />
          <span className="seg-label">Live</span>
        </button>
        <button
          role="radio"
          aria-checked={source.kind === "last"}
          tabIndex={source.kind === "last" ? 0 : -1}
          className={source.kind === "last" ? "on" : ""}
          disabled={!hasHead}
          aria-label={copy.lastCompleted}
          data-tip={copy.lastCompletedVersion}
          onClick={() => onSource({ kind: "last" })}
        >
          <Icon name="history" className="seg-icon" />
          <span className="seg-label">Last completed</span>
        </button>
      </div>
      {source.kind === "version" && (
        <span className="pill">
          <Icon name="eye" size={14} />
          <span className="pill-text">Viewing {source.title}</span>
          <button className="link" onClick={() => onSource({ kind: "live" })}>
            Back to live
          </button>
        </span>
      )}
    </div>
  );
}

export { SourceControls, ViewportControls };

export type { Props };
