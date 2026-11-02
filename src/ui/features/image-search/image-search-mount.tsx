import type { ReactElement } from "react";

import { ImageSearchSlot } from "./image-search-slot.js";
import type { ImageSearchHost } from "./use-image-search-host.js";

interface ImageSearchMountProps {
  readonly directionId: string | null;
  readonly host: ImageSearchHost;
  readonly onDone: (message: string) => void;
  readonly projectId: string;
}

const ImageSearchMount = ({
  directionId,
  host,
  onDone,
  projectId,
}: ImageSearchMountProps): ReactElement | null => {
  const handleClose = host.close;

  if (host.opened === null || directionId === null) {
    return null;
  }

  return (
    <ImageSearchSlot
      directionId={directionId}
      projectId={projectId}
      target={host.opened}
      onClose={handleClose}
      onDone={onDone}
    />
  );
};

export { ImageSearchMount };
