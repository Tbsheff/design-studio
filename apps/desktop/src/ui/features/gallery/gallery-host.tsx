import type { ReactElement } from "react";

import type { SourceLoc } from "./deps.js";
import { GallerySlot } from "./gallery-slot.js";

interface SelectionLike {
  readonly source: SourceLoc | null;
  readonly usedAt?: SourceLoc | null | undefined;
}

interface GalleryHostProps {
  readonly component: {
    readonly file: string;
    readonly name: string;
  } | null;
  readonly directionId: string | null;
  readonly onClose: () => void;
  readonly projectId: string;
  readonly selection: readonly SelectionLike[] | undefined;
}

const targetOf = (
  selection: readonly SelectionLike[] | undefined
): SourceLoc | null => {
  const last = selection?.at(-1);

  return last?.usedAt ?? last?.source ?? null;
};

const GalleryHost = ({
  component,
  directionId,
  onClose,
  projectId,
  selection,
}: GalleryHostProps): ReactElement | null => {
  if (component === null || directionId === null) {
    return null;
  }

  return (
    <GallerySlot
      component={component.name}
      directionId={directionId}
      file={component.file}
      onClose={onClose}
      projectId={projectId}
      target={targetOf(selection)}
    />
  );
};

export { GalleryHost };
