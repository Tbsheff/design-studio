import { Icon } from "@design-studio/ui";
import { useState } from "react";
import type { KeyboardEvent, ReactNode, ReactElement } from "react";

import { PRESETS } from "../../domain/canvas-presets.js";
import type { CanvasSource } from "../../domain/canvas-presets.js";
import { uiStore } from "../../platform/storage.js";
import type { Viewport } from "../../platform/storage.js";
import { copy } from "./copy.js";

const MAX_200 = 200;

const MIN_4000 = 4000;

interface Props {
  viewport: Viewport;
  drawMode?: boolean;
  onToggleDraw?: () => void;
  source: CanvasSource;
  onSource: (canvasSource: CanvasSource) => void;
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

const onRadioGroupKey = (event: KeyboardEvent<HTMLDivElement>): void => {
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
};

const ViewportControls = ({
  viewport,
}: {
  viewport: Viewport;
}): ReactElement => {
  const [customW, setCustomW] = useState(String(viewport.width));
  const [customH, setCustomH] = useState(String(viewport.height));
  const [shown, setShown] = useState(`${viewport.width}x${viewport.height}`);

  if (shown !== `${viewport.width}x${viewport.height}`) {
    setShown(`${viewport.width}x${viewport.height}`);
    setCustomW(String(viewport.width));
    setCustomH(String(viewport.height));
  }

  const applyCustom = (): void => {
    const widthValue = Math.max(
      MAX_200,
      Math.min(MIN_4000, Number.parseInt(customW, 10) || viewport.width)
    );

    const heightValue = Math.max(
      MAX_200,
      Math.min(MIN_4000, Number.parseInt(customH, 10) || viewport.height)
    );

    setCustomW(String(widthValue));
    setCustomH(String(heightValue));
    uiStore.set({
      viewport: { height: heightValue, preset: "custom", width: widthValue },
    });
  };

  const onDimKey = (eventValue: KeyboardEvent<HTMLInputElement>): void => {
    if (eventValue.key !== "Enter") {
      return;
    }

    eventValue.preventDefault();
    applyCustom();
  };

  let tabIndex5: 0 | -1 = -1;

  if (viewport.preset === "custom") {
    tabIndex5 = 0;
  }

  let className5: "" | "on" = "";

  if (viewport.preset === "custom") {
    className5 = "on";
  }

  let content: ReactNode = (
    <span className="dims-readout">
      {viewport.width}
      {copy.times2}
      {viewport.height}
    </span>
  );

  if (viewport.preset === "custom") {
    content = (
      <form
        className="dims"
        onSubmit={(event3) => {
          event3.preventDefault();
          applyCustom();
        }}
      >
        <input
          aria-label={copy.width}
          value={customW}
          onChange={(event4) => setCustomW(event4.target.value)}
          onBlur={applyCustom}
          onKeyDown={onDimKey}
        />
        <span className="x">{copy.times}</span>
        <input
          aria-label={copy.height}
          value={customH}
          onChange={(event5) => setCustomH(event5.target.value)}
          onBlur={applyCustom}
          onKeyDown={onDimKey}
        />
      </form>
    );
  }

  return (
    <div className="toolbar-group">
      <div
        className="segmented icons"
        role="radiogroup"
        aria-label={copy.viewport}
        onKeyDown={onRadioGroupKey}
      >
        {PRESETS.map((viewportPreset) => {
          const datatipalign: "start" | undefined = (():
            | "start"
            | undefined => {
            if (viewportPreset.id !== "desktop") {
              return undefined;
            }

            return "start";
          })();

          let tabIndex3: 0 | -1 = -1;

          if (viewport.preset === viewportPreset.id) {
            tabIndex3 = 0;
          }

          let className3: "" | "on" = "";

          if (viewport.preset === viewportPreset.id) {
            className3 = "on";
          }

          return (
            <button
              key={viewportPreset.id}
              role="radio"
              aria-label={viewportPreset.label}
              data-tip={viewportPreset.label}
              data-tip-align={datatipalign}
              aria-checked={viewport.preset === viewportPreset.id}
              tabIndex={tabIndex3}
              className={className3}
              onClick={() =>
                uiStore.set({
                  viewport: {
                    height: viewportPreset.height,
                    preset: viewportPreset.id,
                    width: viewportPreset.width,
                  },
                })
              }
            >
              <Icon name={viewportPreset.icon} />
            </button>
          );
        })}
        <button
          role="radio"
          aria-label={copy.custom}
          data-tip={copy.customSize}
          aria-checked={viewport.preset === "custom"}
          tabIndex={tabIndex5}
          className={className5}
          onClick={applyCustom}
        >
          <Icon name="custom" />
        </button>
      </div>
      {content}
    </div>
  );
};

const SourceControls = ({
  source,
  onSource,
  hasHead,
}: Pick<Props, "source" | "onSource" | "hasHead">): ReactElement => {
  let tabIndex2: 0 | -1 = 0;

  if (source.kind === "last") {
    tabIndex2 = -1;
  }

  let className2: "" | "on" = "";

  if (source.kind === "live") {
    className2 = "on";
  }

  let tabIndex4: 0 | -1 = -1;

  if (source.kind === "last") {
    tabIndex4 = 0;
  }

  let className4: "" | "on" = "";

  if (source.kind === "last") {
    className4 = "on";
  }

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
          tabIndex={tabIndex2}
          className={className2}
          aria-label={copy.live}
          data-tip={copy.livePreview}
          onClick={() => onSource({ kind: "live" })}
        >
          <Icon name="radio" className="seg-icon" />
          <span className="seg-label">{copy.live}</span>
        </button>
        <button
          role="radio"
          aria-checked={source.kind === "last"}
          tabIndex={tabIndex4}
          className={className4}
          disabled={!hasHead}
          aria-label={copy.lastCompleted}
          data-tip={copy.lastCompletedVersion}
          onClick={() => onSource({ kind: "last" })}
        >
          <Icon name="history" className="seg-icon" />
          <span className="seg-label">{copy.lastCompleted}</span>
        </button>
      </div>
      {source.kind === "version" && (
        <span className="pill">
          <Icon name="eye" size={14} />
          <span className="pill-text">
            {copy.viewing}
            {source.title}
          </span>
          <button className="link" onClick={() => onSource({ kind: "live" })}>
            {copy.backToLive}
          </button>
        </span>
      )}
    </div>
  );
};

export { SourceControls, ViewportControls };

export type { Props };
