import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { toSourceList } from "./nds-model.js";
import { SourceItem } from "./nds-source-item.js";
import type { DraftForm } from "./new-design-system-values.js";

const SourceSummary = ({ form }: { form: DraftForm }): ReactElement => {
  const list = toSourceList(form);

  return (
    <div className="nds-summary">
      <h2>{COPY.textSources}</h2>
      {list.length === 0 && (
        <p className="nds-summary-empty">{COPY.textAddAWebsiteA}</p>
      )}
      {list.length > 0 && (
        <ul>
          {list.map((item) => (
            <SourceItem key={item.label} icon={item.icon} label={item.label} />
          ))}
        </ul>
      )}
    </div>
  );
};

export { SourceSummary };
