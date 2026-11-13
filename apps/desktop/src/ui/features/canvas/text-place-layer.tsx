import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useTextPlace } from "./use-text-place.js";
import type { VectorLayerProps } from "./vector-layer-types.js";

const TextPlaceLayer = (props: VectorLayerProps): ReactElement => {
  const { onPointerDown, root, style } = useTextPlace(props);

  return (
    <div
      ref={root}
      className="vector-layer text-place"
      data-testid="text-place-layer"
      role="application"
      aria-label={copy.textPlaceTool}
      style={style}
      tabIndex={-1}
      onPointerDown={onPointerDown}
    >
      <output className="vector-hint">{copy.textPlaceHint}</output>
    </div>
  );
};

export { TextPlaceLayer };
