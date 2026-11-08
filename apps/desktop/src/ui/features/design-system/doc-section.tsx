import type { PackDetail } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { DocBody } from "./doc-body.js";
import type { Load } from "./use-load.js";

const DocSection = ({ detail }: { detail: Load<PackDetail> }): ReactElement => (
  <section className="lib-detail-section" aria-label={COPY.labelDesignMd}>
    <h3>{COPY.labelDesignMd}</h3>
    <DocBody detail={detail} />
  </section>
);

export { DocSection };
