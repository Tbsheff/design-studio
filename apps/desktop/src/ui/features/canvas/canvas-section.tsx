import type { CanvasSection as CanvasSectionRecord } from "@design-studio/contracts/canvas-file";
import type { ReactElement } from "react";

import { SectionLabel } from "./section-label.js";
import { SectionRect } from "./section-rect.js";
import type { CanvasSectionsApi } from "./use-canvas-sections.js";
import { useSectionHandlers } from "./use-section-handlers.js";

interface CanvasSectionProps {
  readonly api: CanvasSectionsApi;
  readonly freeze: () => void;
  readonly offset: { readonly x: number; readonly y: number };
  readonly section: CanvasSectionRecord;
  readonly zoom: number;
}

const CanvasSection = ({
  api,
  freeze,
  offset,
  section,
  zoom,
}: CanvasSectionProps): ReactElement => {
  const handlers = useSectionHandlers(api, section, { freeze, zoom });
  const { startResize } = handlers;

  return (
    <>
      <SectionRect
        offset={offset}
        onResizeStart={startResize}
        section={section}
      />
      <SectionLabel handlers={handlers} offset={offset} section={section} />
    </>
  );
};

export { CanvasSection };
