import type { SelectionContext } from "@design-studio/contracts";

import type { Box } from "./canvas-frames-model.js";

const unionRect = (selection: SelectionContext[]): Box | null => {
  if (selection.length === 0) {
    return null;
  }

  const left = Math.min(...selection.map((item) => item.rect.x));
  const top = Math.min(...selection.map((item) => item.rect.y));

  const right = Math.max(
    ...selection.map((item) => item.rect.x + item.rect.width)
  );

  const bottom = Math.max(
    ...selection.map((item) => item.rect.y + item.rect.height)
  );

  return { height: bottom - top, width: right - left, x: left, y: top };
};

export { unionRect };
