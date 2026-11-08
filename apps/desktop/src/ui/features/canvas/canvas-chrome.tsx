import type { ReactElement } from "react";

import type { ChromeProps } from "./canvas-chrome-menu.js";
import { ChromeOverlays } from "./chrome-overlays.js";
import { useRulersKey } from "./chrome-rulers.js";
import { ChromeTopBar } from "./chrome-top-bar.js";
import { useChromeHandlers } from "./use-chrome-handlers.js";

const CanvasChrome = (chromeProps: ChromeProps): ReactElement => {
  const handlers = useChromeHandlers(chromeProps);

  useRulersKey();

  return (
    <>
      <ChromeTopBar chrome={chromeProps} handlers={handlers} />
      <ChromeOverlays chrome={chromeProps} handlers={handlers} />
    </>
  );
};

export { CanvasChrome };
