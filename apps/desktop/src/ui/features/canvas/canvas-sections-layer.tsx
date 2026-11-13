import type { ReactElement } from "react";

import { CanvasSection } from "./canvas-section.js";
import { useCanvasSections } from "./use-canvas-sections.js";

interface CanvasSectionsLayerProps {
  readonly freeze: () => void;
  readonly headVersionId: string | null;
  readonly offset: { readonly x: number; readonly y: number };
  readonly projectId: string;
  readonly zoom: number;
}

const CanvasSectionsLayer = ({
  freeze,
  headVersionId,
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
          freeze={freeze}
          headVersionId={headVersionId}
          offset={offset}
          projectId={projectId}
          section={section}
          zoom={zoom}
        />
      ))}
    </div>
  );
};

export { CanvasSectionsLayer };
