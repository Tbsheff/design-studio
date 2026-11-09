import type { ReactElement } from "react";

import { CanvasSection } from "./canvas-section.js";
import { useCanvasSections } from "./use-canvas-sections.js";

interface CanvasSectionsLayerProps {
  readonly offset: { readonly x: number; readonly y: number };
  readonly projectId: string;
  readonly zoom: number;
}

const CanvasSectionsLayer = ({
  offset,
  projectId,
  zoom,
}: CanvasSectionsLayerProps): ReactElement => {
  const api = useCanvasSections(projectId);

  return (
    <div className="canvas-sections">
      {api.sections.map((section) => (
        <CanvasSection
          key={section.id}
          api={api}
          offset={offset}
          section={section}
          zoom={zoom}
        />
      ))}
    </div>
  );
};

export { CanvasSectionsLayer };
