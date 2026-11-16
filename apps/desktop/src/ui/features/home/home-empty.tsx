import type { ReactElement } from "react";

import { FoundList } from "./found-list.js";

const HomeEmpty = ({
  onUse,
}: {
  readonly onUse: (path: string) => void;
}): ReactElement => (
  <div className="home-empty-state">
    <FoundList onUse={onUse} />
  </div>
);

export { HomeEmpty };
