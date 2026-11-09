import { useMemo } from "react";
import type { ReactElement } from "react";

import type { Rect } from "./hotspot-model.js";

interface HotspotBoxProps {
  readonly rect: Rect;
}

const HotspotBox = ({ rect }: HotspotBoxProps): ReactElement => {
  const style = useMemo(
    () => ({
      height: rect.height,
      left: rect.x,
      top: rect.y,
      width: rect.width,
    }),
    [rect]
  );

  return <span className="hotspot-box" style={style} />;
};

export { HotspotBox };
