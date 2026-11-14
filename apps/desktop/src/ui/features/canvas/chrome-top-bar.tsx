import type { ReactElement } from "react";

import { heldTool } from "../../platform/canvas-tool.js";
import { useLive } from "../../platform/live-store.js";
import type { ChromeProps } from "./canvas-chrome-menu.js";
import { fileNameOf, toolOf } from "./canvas-shell.js";
import { CanvasTopBar } from "./canvas-top-bar.js";
import { toBarShell } from "./chrome-model.js";
import type { ChromeHandlers } from "./use-chrome-handlers.js";
import { useVectorTool } from "./vector-tool-model.js";

const ChromeTopBar = ({
  chrome,
  handlers,
}: {
  chrome: ChromeProps;
  handlers: ChromeHandlers;
}): ReactElement => {
  const { comment, proto, shell, ui, zoom } = chrome;
  const bar = toBarShell(shell);
  const { canExport, directionName, onExport, onShareLink, onShip } = bar;
  const { file, onPresent, onTool } = handlers;
  const vector = useVectorTool();
  const activeHeld = useLive(heldTool);

  const { groups, load } = file;
  const { fit, zoomPercent, zoomStep, zoomTo } = zoom;

  const tool = toolOf({
    comment: comment.on,
    held: activeHeld,
    proto: proto.on,
    vector: vector.tool,
  });

  return (
    <CanvasTopBar
      hosts={bar.topBar}
      matrix={chrome.matrix}
      account={chrome.account}
      fileName={fileNameOf(chrome.active, chrome.kind, directionName)}
      fileMenu={groups}
      onFileMenuOpen={load}
      zoom={zoomPercent}
      zoomSetting={ui.zoom}
      onZoomTo={zoomTo}
      onZoomStep={zoomStep}
      onFit={fit}
      tool={tool}
      commentAvailable={comment.available}
      vectorAvailable={vector.available}
      onTool={onTool}
      onPresent={onPresent}
      canPlay={proto.canPlay}
      presentDisabled={!chrome.presentUrl}
      canExport={canExport}
      onExport={onExport}
      onShip={onShip}
      onShareLink={onShareLink}
      theme={chrome.view.theme ?? null}
    />
  );
};

export { ChromeTopBar };
