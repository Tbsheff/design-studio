import type { CanvasSection } from "@design-studio/contracts/canvas-file";
import { useMemo } from "react";
import type { CSSProperties, PointerEvent, ReactElement } from "react";

import { sectionCopy } from "./section-copy.js";
import type { SectionHandle } from "./section-model.js";

interface SectionRectProps {
  readonly offset: { readonly x: number; readonly y: number };
  readonly onResizeStart: (event: PointerEvent<HTMLElement>) => void;
  readonly section: CanvasSection;
}

const HANDLES: readonly SectionHandle[] = ["nw", "ne", "sw", "se"];

const SectionRect = ({
  offset,
  onResizeStart,
  section,
}: SectionRectProps): ReactElement => {
  const style = useMemo(
    (): CSSProperties => ({
      height: section.height,
      left: section.x - offset.x,
      top: section.y - offset.y,
      width: section.width,
    }),
    [section, offset.x, offset.y]
  );

  return (
    <div className="canvas-section" data-section-id={section.id} style={style}>
      {HANDLES.map((handle) => (
        <span
          key={handle}
          className={`canvas-section-handle ${handle}`}
          data-handle={handle}
          data-tip={sectionCopy.resizeSection}
          onPointerDown={onResizeStart}
        />
      ))}
    </div>
  );
};

export { SectionRect };
