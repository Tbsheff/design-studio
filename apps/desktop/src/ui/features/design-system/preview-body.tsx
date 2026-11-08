import type { PackDetail, PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { PackPreview } from "./pack-preview.js";
import type { Load } from "./use-load.js";

const PreviewBody = ({
  detail,
  pack,
}: {
  detail: Load<PackDetail>;
  pack: PackSummary;
}): ReactElement | null => {
  if (detail.error) {
    return (
      <div className="alert error small">
        {COPY.textCouldNotLoadThe}
        {detail.error}
      </div>
    );
  }

  if (detail.value) {
    return <PackPreview pack={pack} entries={detail.value.entries} />;
  }

  return <div className="pv-skeleton" aria-hidden="true" />;
};

export { PreviewBody };
