import type { SelectionContext } from "./deps.js";
import { toBox, toPx, toPxList } from "./grid-model.js";

interface GridGeometry {
  readonly columnGap: number;
  readonly columns: readonly number[];
  readonly innerHeight: number;
  readonly innerWidth: number;
  readonly rowGap: number;
  readonly rows: readonly number[];
  readonly left: number;
  readonly top: number;
}

const toGeometry = (target: SelectionContext): GridGeometry | null => {
  const { rect, styles } = target;
  const padding = toBox(styles.padding);
  const border = toBox(styles["border-width"]);
  const columns = toPxList(styles["grid-template-columns"]);
  const rows = toPxList(styles["grid-template-rows"]);

  if (columns.length === 0 && rows.length === 0) {
    return null;
  }

  return {
    columnGap: toPx(styles["column-gap"]),
    columns: toPxList(styles["grid-template-columns"]),
    innerHeight:
      rect.height - border.top - border.bottom - padding.top - padding.bottom,
    innerWidth:
      rect.width - border.left - border.right - padding.left - padding.right,
    left: rect.x + border.left + padding.left,
    rowGap: toPx(styles["row-gap"]),
    rows: toPxList(styles["grid-template-rows"]),
    top: rect.y + border.top + padding.top,
  };
};

export { toGeometry };

export type { GridGeometry };
