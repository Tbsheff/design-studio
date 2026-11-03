import { Suspense } from "react";
import type { ReactNode } from "react";

import { ShareDialog } from "../../features/share-publish-ship-export/index.js";
import type { ShareTarget } from "../../features/share-publish-ship-export/share-dialog";

interface ShareLayerProps {
  target: ShareTarget | null;
  onClose: () => void;
}

const ShareLayer = ({ target, onClose }: ShareLayerProps): ReactNode => {
  if (!target) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ShareDialog target={target} onClose={onClose} />
    </Suspense>
  );
};

export { ShareLayer };
