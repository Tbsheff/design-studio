import { Fragment, useMemo } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import { toOffsets } from "./grid-model.js";
import type { GridAxis, TrackPx } from "./grid-model.js";
import { GridTrackBox } from "./grid-track-box.js";
import { GridTrackLine } from "./grid-track-line.js";
import type { GridDragStart } from "./use-grid-drag.js";

interface GridAxisLayerProps {
  readonly activeIndex: number | null;
  readonly axis: GridAxis;
  readonly crossSize: number;
  readonly gap: number;
  readonly px: readonly number[];
  readonly thickness: number;
  readonly words: readonly string[];
  readonly left: number;
  readonly top: number;
  readonly onDown: (
    start: GridDragStart,
    event: ReactPointerEvent<HTMLElement>
  ) => void;
  readonly onMove: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly onUp: (event: ReactPointerEvent<HTMLElement>) => void;
}

interface Frame {
  readonly height: number;
  readonly labelLeft: number;
  readonly labelTop: number;
  readonly left: number;
  readonly lineLeft: number;
  readonly lineTop: number;
  readonly top: number;
  readonly width: number;
}

interface FrameInput {
  readonly cross: number;
  readonly gap: number;
  readonly origin: { readonly left: number; readonly top: number };
  readonly track: TrackPx;
}

const toColumnFrame = ({ cross, gap, origin, track }: FrameInput): Frame => ({
  height: cross,
  labelLeft: origin.left + track.offset + track.size / 2,
  labelTop: origin.top,
  left: origin.left + track.offset,
  lineLeft: origin.left + track.offset + track.size + gap / 2,
  lineTop: origin.top,
  top: origin.top,
  width: track.size,
});

const toRowFrame = ({ cross, gap, origin, track }: FrameInput): Frame => ({
  height: track.size,
  labelLeft: origin.left,
  labelTop: origin.top + track.offset + track.size / 2,
  left: origin.left,
  lineLeft: origin.left,
  lineTop: origin.top + track.offset + track.size + gap / 2,
  top: origin.top + track.offset,
  width: cross,
});

const toFrame = (isColumn: boolean, input: FrameInput): Frame => {
  if (isColumn) {
    return toColumnFrame(input);
  }

  return toRowFrame(input);
};

const GridAxisLayer = ({
  activeIndex,
  axis,
  crossSize,
  gap,
  px,
  thickness,
  words,
  left,
  top,
  onDown,
  onMove,
  onUp,
}: GridAxisLayerProps): ReactElement => {
  const tracks = useMemo(() => toOffsets(px, gap), [gap, px]);
  const origin = useMemo(() => ({ left, top }), [left, top]);

  return (
    <>
      {tracks.map((track, index) => {
        const frame = toFrame(axis === "columns", {
          cross: crossSize,
          gap,
          origin,
          track,
        });

        return (
          <Fragment key={`${axis}-${track.offset}`}>
            <GridTrackBox
              height={frame.height}
              isColumn={axis === "columns"}
              label={words[index] ?? ""}
              labelLeft={frame.labelLeft}
              labelTop={frame.labelTop}
              left={frame.left}
              top={frame.top}
              width={frame.width}
            />
            {index < tracks.length - 1 && (
              <GridTrackLine
                axis={axis}
                index={index}
                isActive={activeIndex === index}
                length={crossSize}
                px={px}
                thickness={thickness}
                left={frame.lineLeft}
                top={frame.lineTop}
                words={words}
                onDown={onDown}
                onMove={onMove}
                onUp={onUp}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
};

export { GridAxisLayer };

export type { GridAxisLayerProps };
