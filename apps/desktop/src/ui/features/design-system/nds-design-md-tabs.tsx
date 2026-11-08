import type { ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import { COPY } from "./copy.js";
import { DesignMdTab } from "./nds-design-md-tab.js";
import type { DesignMdView } from "./new-design-system-values.js";

const TABS: DesignMdView[] = ["edit", "preview"];

const DesignMdTabs = ({
  view,
  onSelect,
}: {
  view: DesignMdView;
  onSelect: (view: DesignMdView) => void;
}): ReactElement => (
  <div className="nds-tabs" role="tablist" aria-label={COPY.labelDesignMdView}>
    {TABS.map((tab) => (
      <DesignMdTab
        key={tab}
        isOn={view === tab}
        tab={tab}
        label={toChoice(tab === "edit", COPY.textEdit, COPY.labelPreview)}
        onSelect={onSelect}
      />
    ))}
  </div>
);

export { DesignMdTabs };
