import type { ReactElement, RefObject } from "react";

import { ROLES } from "./aria-roles.js";
import { COPY } from "./copy.js";
import { DmdPreviewBody } from "./dmd-preview-body.js";

const DmdPreviewPane = ({
  previewRef,
  shown,
}: {
  previewRef: RefObject<HTMLDivElement | null>;
  shown: string;
}): ReactElement => (
  <div className="dmd-pane">
    <p className="dmd-pane-label">{COPY.labelPreview}</p>
    <div
      ref={previewRef}
      className="dmd-preview"
      role={ROLES.region}
      aria-label={COPY.labelDesignMdPreview}
      tabIndex={0}
    >
      <DmdPreviewBody shown={shown} />
    </div>
  </div>
);

export { DmdPreviewPane };
