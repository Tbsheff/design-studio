import type { ReactElement } from "react";

import { AssetsRow } from "./assets-row";
import { COLUMN_COPY } from "./copy";

const AssetsPanel = (): ReactElement => (
  <div className="column-list">
    <AssetsRow
      commandId="icon.insert"
      icon="sparkle"
      label={COLUMN_COPY.assetsIcons}
    />
    <AssetsRow
      commandId="image.find"
      icon="image"
      label={COLUMN_COPY.assetsPhotos}
    />
    <p className="column-note">{COLUMN_COPY.assetsNote}</p>
  </div>
);

export { AssetsPanel };
