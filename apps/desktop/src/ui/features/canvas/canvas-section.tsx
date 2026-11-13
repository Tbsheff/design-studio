import type { CanvasSection as CanvasSectionRecord } from "@design-studio/contracts/canvas-file";
import type { ReactElement } from "react";

import { SectionLabel } from "./section-label.js";
import { SectionRect } from "./section-rect.js";
import { StateCheckLine } from "./state-check-line.js";
import type { CanvasSectionsApi } from "./use-canvas-sections.js";
import { useSectionHandlers } from "./use-section-handlers.js";

interface CanvasSectionProps {
  readonly api: CanvasSectionsApi;
  readonly freeze: () => void;
  readonly headVersionId: string | null;
  readonly offset: { readonly x: number; readonly y: number };
  readonly projectId: string;
  readonly section: CanvasSectionRecord;
  readonly zoom: number;
}

const CanvasSection = ({
  api,
  freeze,
  headVersionId,
  offset,
  projectId,
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
      <SectionLabel handlers={handlers} offset={offset} section={section}>
        <StateCheckLine
          headVersionId={headVersionId}
          projectId={projectId}
          section={section}
        />
      </SectionLabel>
    </>
  );
};

export { CanvasSection };
