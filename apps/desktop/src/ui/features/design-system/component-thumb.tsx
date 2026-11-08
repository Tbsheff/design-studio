import type { ComponentInfo } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { useComponentThumb } from "./use-component-thumb.js";

const ICON_SIZE = 20;
const IMAGE_STYLE = { aspectRatio: "auto" };

const ComponentThumb = ({
  active,
  component,
  directionId,
  projectId,
  version,
}: {
  active: boolean;
  component: ComponentInfo;
  directionId: string;
  projectId: string;
  version: string;
}): ReactElement => {
  const { src, state } = useComponentThumb({
    active,
    component,
    directionId,
    projectId,
    version,
  });

  return (
    <span className={`cmp-thumb ${state}`} aria-hidden="true">
      {src && <img src={src} alt="" draggable={false} style={IMAGE_STYLE} />}
      {!src && state === "none" && <Icon name="component" size={ICON_SIZE} />}
    </span>
  );
};

export { ComponentThumb };
