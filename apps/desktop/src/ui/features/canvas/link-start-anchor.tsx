import { Icon } from "@design-studio/ui";
import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import { protoCopy } from "./proto-copy.js";
import type { Box } from "./prototype-model.js";

const START_ICON = 10;

const LinkStartAnchor = ({ start }: { start: Box }): ReactElement => {
  const style = useMemo<CSSProperties>(
    () => ({ left: start.x + start.width, top: start.y }),
    [start.width, start.x, start.y]
  );

  return (
    <span className="link-start-anchor" style={style}>
      <span className="link-start">
        <Icon name="play" size={START_ICON} />
        {protoCopy.start}
      </span>
    </span>
  );
};

export { LinkStartAnchor };
