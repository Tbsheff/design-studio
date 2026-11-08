import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const ICON_SIZE = 14;

const NoneCard = (): ReactElement => (
  <>
    <span className="pack-specimen none" aria-hidden="true">
      <Icon name="close" size={ICON_SIZE} />
    </span>
    <span className="pack-text">
      <span className="pack-name">{COPY.textNoDesignSystem}</span>
      <span className="pack-desc">{COPY.textTheAgentPicksColors}</span>
    </span>
  </>
);

export { NoneCard };
