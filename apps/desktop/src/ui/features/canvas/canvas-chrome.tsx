import type { ReactElement } from "react";

import type { ChromeProps } from "./canvas-chrome-menu.js";
import { ChromeOverlays } from "./chrome-overlays.js";
import { useRulersKey } from "./chrome-rulers.js";
import { ChromeTopBar } from "./chrome-top-bar.js";
import { PagesList } from "./pages-list.js";
import { useChromeHandlers } from "./use-chrome-handlers.js";
import { useToolEvents } from "./use-tool-events.js";

const CanvasChrome = ({ chrome }: { chrome: ChromeProps }): ReactElement => {
  const handlers = useChromeHandlers(chrome);

  useRulersKey();
  useToolEvents(handlers);

  return (
    <>
      <ChromeTopBar chrome={chrome} handlers={handlers} />
      <ChromeOverlays chrome={chrome} handlers={handlers} />
      {chrome.shell?.pagesHost && (
        <PagesList file={handlers.file} host={chrome.shell.pagesHost} />
      )}
    </>
  );
};

export { CanvasChrome };
