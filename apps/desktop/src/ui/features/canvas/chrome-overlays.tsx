import type { ReactElement } from "react";

import type { ChromeProps } from "./canvas-chrome-menu.js";
import { PresentLayer } from "./canvas-overlays.js";
import { scopeOf } from "./canvas-shell.js";
import { isViewOpen } from "./chrome-model.js";
import { ChromeViewRow } from "./chrome-view-row.js";
import { TweakPrompt } from "./tweak-prompt.js";
import type { ChromeHandlers } from "./use-chrome-handlers.js";

const ChromeOverlays = ({
  chrome,
  handlers,
}: {
  chrome: ChromeProps;
  handlers: ChromeHandlers;
}): ReactElement => {
  const { closeImport, closePresent, closeTweak, present } = handlers;
  const { directionId, importPage, presentUrl, sandbox, shell } = chrome;
  const onTweak = shell?.onTweak ?? null;

  return (
    <>
      {handlers.isTweakOpen && onTweak && (
        <TweakPrompt
          scope={scopeOf(chrome.selection)}
          onSend={onTweak}
          onClose={closeTweak}
        />
      )}
      {isViewOpen(chrome) && <ChromeViewRow chrome={chrome} />}
      {handlers.isImporting && directionId && importPage.render(closeImport)}
      {present && presentUrl && (
        <PresentLayer
          url={presentUrl}
          sandbox={sandbox}
          fullscreen={present === "fullscreen"}
          onClose={closePresent}
        />
      )}
    </>
  );
};

export { ChromeOverlays };
