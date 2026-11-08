import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const ALERT_ICON_SIZE = 14;
const PERCENT = 100;

const ContextNotice = ({ share }: { share: number }): ReactElement => (
  <output className="ui-notice run-notice" data-testid="context-notice">
    <Icon name="alert" size={ALERT_ICON_SIZE} />
    <span>
      {copy.thisChatUses}
      {Math.round(share * PERCENT)}
      {copy.ofTheContextWindow}
    </span>
  </output>
);

export { ContextNotice };
