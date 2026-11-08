import type { SelectionContext } from "@design-studio/contracts";
import type { ReactNode, ReactElement } from "react";

import { formatMeasure, measureBetween } from "../../../shared/measure.js";
import type { MeasureLine } from "../../../shared/measure.js";
import { copy } from "./copy.js";
import { unionBox } from "./snap-model.js";
import type { SnapGuide } from "./snap-model.js";
import type { HoverBox } from "./use-preview-frames.js";
import type { ResizeControl, ResizeEdge } from "./use-resize-handles.js";

const LABEL_ROOM = 24;

interface Props {
  hover: HoverBox | null;
  selection: SelectionContext[];
  comments: ReactNode;
  zoom: number;
  resize?: ResizeControl;
  spacing?: ReactNode;
}

const EDGES: ResizeEdge[] = ["e", "s", "se"];
const COMPACT_EDGES: ResizeEdge[] = ["se"];
const COMPACT_PX = 40;

const ResizeHandles = ({
  control,
  rect,
  zoom,
}: {
  control: ResizeControl;
  rect: SelectionContext["rect"];
  zoom: number;
}): ReactElement => {
  const { live } = control;
  const compact = Math.min(rect.width, rect.height) * zoom < COMPACT_PX;

  return (
    <div
      className={`resize-frame${live ? " active" : ""}${compact ? " compact" : ""}`}
      data-testid="resize-frame"
      style={{
        height: live?.boxHeight ?? rect.height,
        left: rect.x,
        top: rect.y,
        width: live?.boxWidth ?? rect.width,
      }}
    >
      {(compact ? COMPACT_EDGES : EDGES).map((edge) => (
        <div
          key={edge}
          className={`resize-handle ${edge}`}
          aria-hidden="true"
          onPointerDown={(event) => control.onHandleDown(edge, event)}
        />
      ))}
      {live && (
        <span className="resize-label" data-testid="resize-label">
          {live.width}
          {copy.times2}
          {live.height}
        </span>
      )}
    </div>
  );
};

const guideStyle = (snapGuide: SnapGuide) =>
  snapGuide.axis === "x"
    ? {
        height: snapGuide.to - snapGuide.from,
        left: snapGuide.at,
        top: snapGuide.from,
      }
    : {
        left: snapGuide.from,
        top: snapGuide.at,
        width: snapGuide.to - snapGuide.from,
      };

const fullStyle = (snapGuideValue: SnapGuide) =>
  snapGuideValue.axis === "x"
    ? { bottom: 0, left: snapGuideValue.at, top: 0 }
    : { left: 0, right: 0, top: snapGuideValue.at };

const SnapGuides = ({
  guides,
  full,
}: {
  guides: SnapGuide[];
  full?: boolean;
}): ReactElement | null => {
  if (guides.length === 0) {
    return null;
  }

  return (
    <div
      className={`snap-guides${full ? " full" : ""}`}
      data-testid="snap-guides"
    >
      {guides.map((snapGuide3) => (
        <div
          key={`${snapGuide3.axis}-${snapGuide3.at}`}
          className={`snap-guide ${snapGuide3.axis}`}
          style={full ? fullStyle(snapGuide3) : guideStyle(snapGuide3)}
        />
      ))}
    </div>
  );
};

const lineStyle = (measureLine: MeasureLine) =>
  measureLine.axis === "x"
    ? {
        left: measureLine.from,
        top: measureLine.at,
        width: measureLine.to - measureLine.from,
      }
    : {
        height: measureLine.to - measureLine.from,
        left: measureLine.at,
        top: measureLine.from,
      };

const Measurements = ({
  from,
  to,
}: {
  from: SelectionContext["rect"];
  to: SelectionContext["rect"];
}): ReactElement => {
  const lines = measureBetween(from, to);

  return (
    <div className="measure" data-testid="measure">
      <div
        className="box measure-target"
        style={{ height: to.height, left: to.x, top: to.y, width: to.width }}
      />
      {lines.map((measureLineValue) => (
        <div
          key={`${measureLineValue.axis}-${measureLineValue.from}-${measureLineValue.to}`}
          className={`measure-line ${measureLineValue.axis}`}
          style={lineStyle(measureLineValue)}
        >
          <span className="measure-label" data-value={measureLineValue.value}>
            {formatMeasure(measureLineValue.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const sameRect = (
  first: SelectionContext["rect"],
  second: SelectionContext["rect"]
): boolean =>
  Math.abs(first.x - second.x) < 0.5 &&
  Math.abs(first.y - second.y) < 0.5 &&
  Math.abs(first.width - second.width) < 0.5 &&
  Math.abs(first.height - second.height) < 0.5;

const ArtboardOverlay = ({
  hover,
  selection,
  comments,
  zoom,
  resize,
  spacing,
}: Props): ReactElement => {
  const anchor = unionBox(
    selection.map((selectionContext) => selectionContext.rect)
  );

  const measuring = hover?.altKey && anchor && !hover.fromTree;

  const onSelected =
    hover !== null &&
    selection.some((selectionContextValue) =>
      sameRect(selectionContextValue.rect, hover.rect)
    );

  return (
    <div className="overlay">
      {hover && !measuring && !onSelected && (
        <div
          className="box hover"
          style={{
            height: hover.rect.height,
            left: hover.rect.x,
            top: hover.rect.y,
            width: hover.rect.width,
          }}
        >
          {hover.label && (
            <span
              className={`box-label${hover.rect.y * zoom < LABEL_ROOM ? " inside" : ""}`}
            >
              {hover.label}
            </span>
          )}
        </div>
      )}
      {selection.map((selectionContext3) => {
        const live =
          resize?.target?.selector === selectionContext3.selector
            ? resize.live
            : null;

        return (
          <div
            key={selectionContext3.selector}
            className="box selected"
            data-selector={selectionContext3.selector}
            style={{
              height: live?.boxHeight ?? selectionContext3.rect.height,
              left: selectionContext3.rect.x,
              top: selectionContext3.rect.y,
              width: live?.boxWidth ?? selectionContext3.rect.width,
            }}
          />
        );
      })}
      {!resize?.live && spacing}
      {resize?.target && (
        <ResizeHandles control={resize} rect={resize.target.rect} zoom={zoom} />
      )}
      {resize?.live && <SnapGuides guides={resize.live.guides} full />}
      {measuring && hover && anchor && (
        <Measurements from={anchor} to={hover.rect} />
      )}
      {comments}
    </div>
  );
};

export { ArtboardOverlay, SnapGuides, guideStyle };
