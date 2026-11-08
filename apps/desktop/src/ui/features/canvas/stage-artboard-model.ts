import type { CSSProperties } from "react";

const toArtboardStyle = (
  widthPx: number,
  heightPx: number,
  isHidden: boolean
): CSSProperties => {
  if (isHidden) {
    return { height: heightPx, visibility: "hidden", width: widthPx };
  }

  return { height: heightPx, width: widthPx };
};

export { toArtboardStyle };
