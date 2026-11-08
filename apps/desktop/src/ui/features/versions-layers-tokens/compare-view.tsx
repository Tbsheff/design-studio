import type { ProjectKind, Version } from "@design-studio/contracts";
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { useUi, writeStored } from "../../platform/storage.js";
import type { BoardProps } from "./compare-board-types.js";
import {
  MODE_KEY,
  MODES,
  toCompareClass,
  toKeyStep,
  toSavedMode,
} from "./compare-mode-model.js";
import type { Mode } from "./compare-mode-model.js";
import { CompareSidePane } from "./compare-side-pane.js";
import { CompareToolbar } from "./compare-toolbar.js";
import { COPY } from "./copy.js";
import { OverlayBoard } from "./overlay-board.js";
import { ReferenceBoard } from "./reference-board.js";
import { SliderBoard } from "./slider-board.js";
import { useCompareLayout } from "./use-compare-layout.js";
import { displayTitle, indexVersions } from "./version-labels.js";

import "../../styles/reference.css";

const CompareCode = lazy(async () => {
  const loaded = await import("./compare-code.js");

  return { default: loaded.CompareCode };
});

function ModeSwitch({
  mode,
  onMode,
}: {
  mode: Mode;
  onMode: (mode: Mode) => void;
}) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = toKeyStep(event.key);

    if (delta === 0) {
      return;
    }

    event.preventDefault();

    const index =
      (MODES.findIndex((item) => item.id === mode) + delta + MODES.length) %
      MODES.length;

    const next = MODES[index];

    if (!next) {
      return;
    }

    onMode(next.id);

    buttonsRef.current[index]?.focus();
  };

  return (
    <div
      className="segmented compare-modes"
      role="radiogroup"
      aria-label={COPY.labelCompareMode}
      onKeyDown={onKeyDown}
    >
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          ref={(node) => {
            buttonsRef.current[MODES.indexOf(item)] = node;
          }}
          role="radio"
          aria-checked={mode === item.id}
          tabIndex={mode === item.id ? 0 : -1}
          className={mode === item.id ? "on" : ""}
          data-tip={item.tip}
          onClick={() => onMode(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

interface Props {
  projectId: string;
  kind: ProjectKind;
  left: Version;
  right: Version;
  versions?: Version[];
  onClose: () => void;
}

function CompareView({
  projectId,
  kind,
  left,
  right,
  versions,
  onClose,
}: Props) {
  const { viewport } = useUi();
  const [mode, setModeState] = useState<Mode>(toSavedMode);
  const [error, setError] = useState<string | null>(null);
  const { isStacked, ref, scale } = useCompareLayout(mode, viewport);

  const [older, newer] =
    left.createdAt <= right.createdAt ? [left, right] : [right, left];

  const index = useMemo(
    () => indexVersions(versions ?? [left, right]),
    [versions, left, right]
  );

  const handleMode = useCallback((next: Mode): void => {
    setModeState(next);
    writeStored(MODE_KEY, next);
  }, []);

  const board: BoardProps = {
    kind,
    newer,
    newerTitle: displayTitle(newer, index),
    older,
    olderTitle: displayTitle(older, index),
    onError: setError,
    projectId,
    scale,
    viewport: { height: viewport.height, width: viewport.width },
  };

  return (
    <div className="canvas">
      <CompareToolbar
        height={viewport.height}
        onClose={onClose}
        width={viewport.width}
      >
        <ModeSwitch mode={mode} onMode={handleMode} />
      </CompareToolbar>
      {mode === "code" && (
        <div className="compare-code-scroll" data-mode={mode}>
          <Suspense fallback={null}>
            <CompareCode projectId={projectId} older={older} newer={newer} />
          </Suspense>
        </div>
      )}
      {mode !== "code" && (
        <div
          className={toCompareClass(mode, isStacked)}
          ref={ref}
          data-mode={mode}
        >
          {error && (
            <div className="stage-message" role="alert">
              {error}
            </div>
          )}
          {mode === "side" && (
            <>
              <CompareSidePane board={board} side="A" />
              <CompareSidePane board={board} side="B" />
            </>
          )}
          {mode === "slider" && <SliderBoard {...board} />}
          {mode === "overlay" && <OverlayBoard {...board} />}
          {mode === "reference" && <ReferenceBoard {...board} />}
        </div>
      )}
    </div>
  );
}

export { CompareView };
