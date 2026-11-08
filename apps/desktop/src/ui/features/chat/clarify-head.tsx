import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const HEAD_ICON_SIZE = 14;

const ClarifyHead = (): ReactElement => (
  <div className="clarify-head">
    <Icon name="sparkle" size={HEAD_ICON_SIZE} />
    <h2 id="clarify-heading">{copy.aFewQuickQuestions}</h2>
    <span className="clarify-hint">{copy.shortBriefsBuildBetter}</span>
  </div>
);

export { ClarifyHead };
