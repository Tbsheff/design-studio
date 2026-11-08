import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const CrumbSeparator = (): ReactElement => (
  <li aria-hidden="true" className="ins-crumb-sep">
    <Icon name="chevronRight" size={12} />
  </li>
);

export { CrumbSeparator };
