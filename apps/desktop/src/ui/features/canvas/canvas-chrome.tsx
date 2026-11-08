import type { ReactElement } from "react";

import type { ChromeProps } from "./canvas-chrome-menu.js";
import { ChromeOverlays } from "./chrome-overlays.js";
import { useRulersKey } from "./chrome-rulers.js";
import { ChromeTopBar } from "./chrome-top-bar.js";
import { useChromeHandlers } from "./use-chrome-handlers.js";

const CanvasChrome = ({ chrome }: { chrome: ChromeProps }): ReactElement => {
  const handlers = useChromeHandlers(chrome);

  useRulersKey();

  return (
    <>
      <ChromeTopBar chrome={chrome} handlers={handlers} />
      <ChromeOverlays chrome={chrome} handlers={handlers} />
    </>
  );
};

export { CanvasChrome };
