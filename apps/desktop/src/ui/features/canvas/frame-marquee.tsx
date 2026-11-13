import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import { useFrameMarqueeBox } from "./use-frame-selection.js";

const FrameMarquee = (): ReactElement | null => {
  const box = useFrameMarqueeBox();

  const style = useMemo((): CSSProperties | null => {
    if (box === null) {
      return null;
    }

    return { height: box.height, left: box.x, top: box.y, width: box.width };
  }, [box]);

  if (style === null) {
    return null;
  }

  return (
    <div className="frame-marquee" data-testid="frame-marquee" style={style} />
  );
};

export { FrameMarquee };
