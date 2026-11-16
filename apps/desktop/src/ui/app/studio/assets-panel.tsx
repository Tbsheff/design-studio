import type { ReactElement } from "react";

import { AssetsRow } from "./assets-row";
import { AssetsTokens } from "./assets-tokens";
import { COLUMN_COPY } from "./copy";
import type { StudioCtxProps } from "./studio-context";

const AssetsPanel = ({ ctx }: StudioCtxProps): ReactElement => (
  <div className="assets-panel">
    <section className="column-list" aria-label={COLUMN_COPY.assetsInsert}>
      <h3 className="column-group-head">{COLUMN_COPY.assetsInsert}</h3>
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
    </section>
    <section className="assets-tokens" aria-label={COLUMN_COPY.assetsTokens}>
      <h3 className="column-group-head">{COLUMN_COPY.assetsTokens}</h3>
      <AssetsTokens ctx={ctx} />
    </section>
  </div>
);

export { AssetsPanel };
