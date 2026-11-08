import type { DraftSourceStatus } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { KIND_ICON } from "./draft-sources-model.js";
import { SourceDetail } from "./source-detail.js";
import { SourceLine } from "./source-line.js";

const KIND_SIZE = 14;

const SourceRow = ({ source }: { source: DraftSourceStatus }): ReactElement => (
  <li className="ds-src-row" data-state={source.state}>
    <span className="ds-src-kind" aria-hidden="true">
      <Icon name={KIND_ICON[source.kind]} size={KIND_SIZE} />
    </span>
    <div className="ds-src-text">
      <SourceLine source={source} />
      <SourceDetail source={source} />
      {source.note && <p className="ds-src-note-line">{source.note}</p>}
    </div>
  </li>
);

export { SourceRow };
