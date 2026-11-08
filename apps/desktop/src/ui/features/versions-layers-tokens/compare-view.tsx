import type { ProjectKind, Version } from "@design-studio/contracts";
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { useUi, writeStored } from "../../platform/storage.js";
import type { BoardProps } from "./compare-board-types.js";
import {
  MODE_KEY,
  MODES,
  toCompareClass,
  toKeyStep,
  toSavedMode,
} from "./compare-mode-model.js";
import type { Mode, ModeOption } from "./compare-mode-model.js";
import { CompareSidePane } from "./compare-side-pane.js";
import { CompareToolbar } from "./compare-toolbar.js";
import { COPY } from "./copy.js";
import { OverlayBoard } from "./overlay-board.js";
import { ReferenceBoard } from "./reference-board.js";
import { SliderBoard } from "./slider-board.js";
import { useCompareLayout } from "./use-compare-layout.js";
import { displayTitle, indexVersions } from "./version-labels.js";

const CompareCode = lazy(async () => {
  const loaded = await import("./compare-code.js");

  return { default: loaded.CompareCode };
});

interface ModeSwitchProps {
  readonly mode: Mode;
  readonly onMode: (mode: Mode) => void;
}

interface ModeButtonProps {
  readonly index: number;
  readonly isOn: boolean;
  readonly onMode: (mode: Mode) => void;
  readonly onRef: (index: number, node: HTMLButtonElement | null) => void;
  readonly option: ModeOption;
}

const ModeButton = ({
  index,
  isOn,
  onMode,
  onRef,
  option,
}: ModeButtonProps): ReactNode => {
  const handleRef = useCallback(
    (node: HTMLButtonElement | null): void => {
      onRef(index, node);
    },
    [index, onRef]
  );

  const handleSelect = useCallback((): void => {
    onMode(option.id);
  }, [onMode, option.id]);

  let tabIndex = -1;
  let className = "";

  if (isOn) {
    tabIndex = 0;
    className = "on";
  }

  return (
    <button
      type="button"
      ref={handleRef}
      role="radio"
      aria-checked={isOn}
      tabIndex={tabIndex}
      className={className}
      data-tip={option.tip}
      onClick={handleSelect}
    >
      {option.label}
    </button>
  );
};

const ModeSwitch = ({ mode, onMode }: ModeSwitchProps): ReactNode => {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
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
    },
    [mode, onMode]
  );

  const handleRef = useCallback(
    (index: number, node: HTMLButtonElement | null): void => {
      buttonsRef.current[index] = node;
    },
    []
  );

  return (
    <div
      className="segmented compare-modes"
      role="radiogroup"
      aria-label={COPY.labelCompareMode}
      onKeyDown={handleKeyDown}
    >
      {MODES.map((item, index) => (
        <ModeButton
          key={item.id}
          index={index}
          isOn={mode === item.id}
          option={item}
          onMode={onMode}
          onRef={handleRef}
        />
      ))}
    </div>
  );
};

const toOrdered = (left: Version, right: Version): [Version, Version] => {
  if (left.createdAt <= right.createdAt) {
    return [left, right];
  }

  return [right, left];
};

interface CompareViewProps {
  projectId: string;
  kind: ProjectKind;
  left: Version;
  right: Version;
  versions?: Version[];
  onClose: () => void;
}

const CompareView = ({
  projectId,
  kind,
  left,
  right,
  versions,
  onClose,
}: CompareViewProps): ReactNode => {
  const { viewport } = useUi();
  const [mode, setModeState] = useState<Mode>(toSavedMode);
  const [error, setError] = useState<string | null>(null);
  const { isStacked, ref, scale } = useCompareLayout(mode, viewport);

  const [older, newer] = toOrdered(left, right);

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
};

export { CompareView };

export type { CompareViewProps };
