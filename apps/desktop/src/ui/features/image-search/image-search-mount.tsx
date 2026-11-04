import type { ReactElement } from "react";

import type { RenderGenerate } from "./generate-tab.js";
import { ImageSearchSlot } from "./image-search-slot.js";
import type { ImageSearchHost } from "./use-image-search-host.js";

interface ImageSearchMountProps {
  readonly directionId: string | null;
  readonly host: ImageSearchHost;
  readonly onDone: (message: string) => void;
  readonly projectId: string;
  readonly renderGenerate?: RenderGenerate | undefined;
}

const ImageSearchMount = ({
  directionId,
  host,
  onDone,
  projectId,
  renderGenerate,
}: ImageSearchMountProps): ReactElement | null => {
  const handleClose = host.close;

  if (host.opened === null || directionId === null) {
    return null;
  }

  return (
    <ImageSearchSlot
      directionId={directionId}
      projectId={projectId}
      renderGenerate={renderGenerate}
      target={host.opened}
      onClose={handleClose}
      onDone={onDone}
    />
  );
};

export { ImageSearchMount };
