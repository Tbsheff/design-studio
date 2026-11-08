import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const EmptyCard = (): ReactElement => (
  <div className="ins-empty-card">
    <span className="ins-empty-icon" aria-hidden="true">
      <Icon name="pointer" size={16} />
    </span>
    <p className="ins-empty-title">{copy.selectTitle}</p>
    <p className="ins-empty-text">{copy.selectText}</p>
  </div>
);

export { EmptyCard };
