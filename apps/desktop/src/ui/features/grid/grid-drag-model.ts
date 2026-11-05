import type { SelectionContext } from "./deps.js";
import type { GridAxis, TrackDrag } from "./grid-model.js";
import { toTracksText } from "./grid-model.js";

interface GridDragLive extends TrackDrag {
  readonly axis: GridAxis;
  readonly index: number;
}

const STYLE_KEY = {
  columns: "grid-template-columns",
  rows: "grid-template-rows",
} as const;

const toChange = (
  live: GridDragLive
): { columns: string } | { rows: string } => {
  const text = toTracksText(live.words);

  if (live.axis === "columns") {
    return { columns: text };
  }

  return { rows: text };
};

const toStyled = (
  items: SelectionContext[],
  selector: string,
  live: GridDragLive
): SelectionContext[] =>
  items.map((item) => {
    if (item.selector !== selector) {
      return item;
    }

    const value = live.px.map((size) => `${size}px`).join(" ");

    return {
      ...item,
      styles: { ...item.styles, [STYLE_KEY[live.axis]]: value },
    };
  });

export { toChange, toStyled };

export type { GridDragLive };
