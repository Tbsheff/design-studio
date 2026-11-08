import type { PackDetail, PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { PreviewBody } from "./preview-body.js";
import type { Load } from "./use-load.js";

const PreviewSection = ({
  detail,
  pack,
}: {
  detail: Load<PackDetail>;
  pack: PackSummary;
}): ReactElement => (
  <section className="lib-detail-section" aria-label={COPY.labelPreview}>
    <h3>{COPY.labelPreview}</h3>
    <PreviewBody detail={detail} pack={pack} />
  </section>
);

export { PreviewSection };
