import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { openConnectAi } from "../../domain/connect-ai-events.js";
import { ConnectAiTitles } from "./connect-ai-titles.js";
import { copy as uiCopy } from "./copy.js";

const ConnectAiOpener = (): ReactElement => (
  <section className="connect-ai-opener" aria-label={uiCopy.connectAi}>
    <ConnectAiTitles
      title={uiCopy.connectAi}
      note={uiCopy.connectAiHandoffNote}
    />
    <button
      type="button"
      className="btn small has-icon"
      onClick={openConnectAi}
    >
      <Icon name="sparkle" size={14} />
      <span>{uiCopy.connectAiOpen}</span>
    </button>
  </section>
);

export { ConnectAiOpener };
