import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const PackYoursTag = ({ isUser }: { isUser: boolean }): ReactElement | null => {
  if (!isUser) {
    return null;
  }

  return <span className="pack-yours">{COPY.titleYours}</span>;
};

export { PackYoursTag };
