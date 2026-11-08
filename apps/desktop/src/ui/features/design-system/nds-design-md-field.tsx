import { useState } from "react";
import type { ReactElement } from "react";

import { DesignMdBody } from "./nds-design-md-body.js";
import { DesignMdTabs } from "./nds-design-md-tabs.js";
import type { DesignMdView } from "./new-design-system-values.js";

const DesignMdField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): ReactElement => {
  const [view, setView] = useState<DesignMdView>("edit");

  return (
    <div className="nds-md">
      <DesignMdTabs view={view} onSelect={setView} />
      <DesignMdBody view={view} value={value} onChange={onChange} />
    </div>
  );
};

export { DesignMdField };
