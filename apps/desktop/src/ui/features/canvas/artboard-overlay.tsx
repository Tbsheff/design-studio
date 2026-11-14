import type { SelectionContext } from "@design-studio/contracts";
import type { ReactNode, ReactElement } from "react";

import { GroupRotateFrame } from "./group-rotate-frame.js";
import { Measurements } from "./measurements.js";
import { toRectStyle } from "./overlay-styles.js";
import type { HoverBox } from "./preview-rect-model.js";
import { ResizeHandles } from "./resize-handles.js";
import { SnapGuides } from "./snap-guides.js";
import { unionBox } from "./snap-model.js";
import type { ResizeControl, ResizeLive } from "./use-resize-handles.js";

const ABS_0_5 = 0.5;

const LABEL_ROOM = 24;

interface Props {
  hover: HoverBox | null;
  selection: SelectionContext[];
  comments: ReactNode;
  zoom: number;
  resize?: ResizeControl;
  spacing?: ReactNode;
}

const sameRect = (
  first: SelectionContext["rect"],
  second: SelectionContext["rect"]
): boolean =>
  Math.abs(first.x - second.x) < ABS_0_5 &&
  Math.abs(first.y - second.y) < ABS_0_5 &&
  Math.abs(first.width - second.width) < ABS_0_5 &&
  Math.abs(first.height - second.height) < ABS_0_5;

const labelPlace = (screenTop: number): "" | " inside" => {
  if (screenTop < LABEL_ROOM) {
    return " inside";
  }

  return "";
};

const toLiveRect = (
  rect: SelectionContext["rect"],
  live: ResizeLive | null
): SelectionContext["rect"] => {
  if (live) {
    return { ...rect, x: live.boxX, y: live.boxY };
  }

  return rect;
};

const toLiveSize = (
  live: ResizeLive | null
): { height: number; width: number } | null => {
  if (live) {
    return { height: live.boxHeight, width: live.boxWidth };
  }

  return null;
};

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
        <div className="box hover" style={toRectStyle(hover.rect, null)}>
          {hover.label && (
            <span className={`box-label${labelPlace(hover.rect.y * zoom)}`}>
              {hover.label}
            </span>
          )}
        </div>
      )}
      {selection.map((selectionContext3) => {
        let live: ResizeLive | null = null;

        if (resize?.target?.selector === selectionContext3.selector) {
          ({ live } = resize);
        }

        return (
          <div
            key={selectionContext3.selector}
            className="box selected"
            data-selector={selectionContext3.selector}
            style={toRectStyle(
              toLiveRect(selectionContext3.rect, live),
              toLiveSize(live)
            )}
          />
        );
      })}
      {!resize?.live && !resize?.ghost && spacing}
      {resize?.target && (
        <ResizeHandles control={resize} rect={resize.target.rect} zoom={zoom} />
      )}
      <GroupRotateFrame control={resize} rect={anchor} />
      {resize?.live && <SnapGuides guides={resize.live.guides} full />}
      {measuring && hover && anchor && (
        <Measurements from={anchor} to={hover.rect} />
      )}
      {comments}
    </div>
  );
};

export { ArtboardOverlay };
