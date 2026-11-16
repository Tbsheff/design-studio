import type { ReactElement } from "react";

import { AssetsRow } from "./assets-row";
import { COLUMN_COPY } from "./copy";

const AssetsPanel = ({
  tokens,
}: {
  readonly tokens: ReactElement;
}): ReactElement => (
  <div className="column-assets">
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
    <section className="column-group" aria-label={COLUMN_COPY.assetsTokens}>
      <h3 className="column-group-head">{COLUMN_COPY.assetsTokens}</h3>
      {tokens}
    </section>
  </div>
);

export { AssetsPanel };
