import { useRef } from "react";
import type { ReactElement, RefObject } from "react";

import { rulerGuideCopy } from "./copy.js";
import {
  toDragClass,
  toGuideClass,
  toGuideStyle,
  toLabelText,
} from "./ruler-guide-model.js";
import { useRulerGuides } from "./use-ruler-guides.js";

interface RulerGuideLayerProps {
  readonly artboardRef: RefObject<HTMLDivElement | null>;
  readonly origin: { readonly x: number; readonly y: number };
  readonly projectId: string;
}

const RulerGuideLayer = ({
  artboardRef,
  origin,
  projectId,
}: RulerGuideLayerProps): ReactElement => {
  const hostRef = useRef<HTMLDivElement>(null);

  const { drag, guides, onGuideDown, onRulerDown, view } = useRulerGuides({
    artboardRef,
    hostRef,
    origin,
    projectId,
  });

  return (
    <div ref={hostRef} className="ruler-guides" data-testid="ruler-guides">
      {view &&
        guides.map((guide, index) => (
          <div
            key={`${guide.axis}:${guide.at}`}
            className={toGuideClass(guide, drag?.index === index)}
            style={toGuideStyle(guide, view, origin)}
            data-axis={guide.axis}
            data-index={index}
            data-testid="ruler-guide"
            data-tip={rulerGuideCopy.guide}
            onPointerDown={onGuideDown}
          />
        ))}
      {view && drag && (
        <div
          className={toDragClass(drag)}
          style={toGuideStyle(drag.guide, view, origin)}
          data-testid="ruler-guide-drag"
        >
          <span className="ruler-guide-label">{toLabelText(drag.guide)}</span>
        </div>
      )}
      <div
        className="ruler-guide-strip top"
        data-axis="y"
        data-testid="ruler-guide-strip-top"
        onPointerDown={onRulerDown}
      />
      <div
        className="ruler-guide-strip left"
        data-axis="x"
        data-testid="ruler-guide-strip-left"
        onPointerDown={onRulerDown}
      />
    </div>
  );
};

export { RulerGuideLayer };
