import type { ReactElement } from "react";

import { ContentDialog } from "./content-dialog.js";
import type { ContentHost } from "./use-content-host.js";

interface ContentMountProps {
  readonly host: ContentHost;
}

const ContentMount = ({ host }: ContentMountProps): ReactElement | null => {
  if (host.opened === null) {
    return null;
  }

  const handleClose = host.close;

  return <ContentDialog onClose={handleClose} opened={host.opened} />;
};

export { ContentMount };

export type { ContentMountProps };
