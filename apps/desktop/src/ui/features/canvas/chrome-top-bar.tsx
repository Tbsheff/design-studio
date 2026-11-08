import type { ReactElement } from "react";

import { requestAskChat } from "../../platform/ask-chat.js";
import type { ChromeProps } from "./canvas-chrome-menu.js";
import { fileNameOf, toolOf } from "./canvas-shell.js";
import { CanvasTopBar } from "./canvas-top-bar.js";
import { isViewOpen, toBarShell } from "./chrome-model.js";
import type { ChromeHandlers } from "./use-chrome-handlers.js";
import { VectorToolButtons } from "./vector-tool-buttons.js";

const VECTOR_TOOLS = <VectorToolButtons />;

const ChromeTopBar = ({
  chrome,
  handlers,
}: {
  chrome: ChromeProps;
  handlers: ChromeHandlers;
}): ReactElement => {
  const { comment, proto, shell, ui, zoom } = chrome;
  const bar = toBarShell(shell);
  const { canExport, directionName, onExpandPane, onExport } = bar;
  const { onShareLink, onShip, paneCollapsed } = bar;
  const { file, onPresent, onTool, reload, toggleView } = handlers;

  const { groups, load } = file;
  const { fit, zoomPercent, zoomStep, zoomTo } = zoom;

  return (
    <CanvasTopBar
      vectorTools={VECTOR_TOOLS}
      matrix={chrome.matrix}
      paneCollapsed={paneCollapsed}
      onExpandPane={onExpandPane}
      onReload={reload}
      onAskChat={requestAskChat}
      fileName={fileNameOf(chrome.active, chrome.kind, directionName)}
      fileMenu={groups}
      onFileMenuOpen={load}
      zoom={zoomPercent}
      zoomSetting={ui.zoom}
      onZoomTo={zoomTo}
      onZoomStep={zoomStep}
      onFit={fit}
      tool={toolOf(shell?.pane, comment.on, chrome.selectMode, proto.on)}
      commentAvailable={comment.available}
      onTool={onTool}
      viewOpen={isViewOpen(chrome)}
      onToggleView={toggleView}
      onPresent={onPresent}
      presentDisabled={!chrome.presentUrl}
      canExport={canExport}
      onExport={onExport}
      onShip={onShip}
      onShareLink={onShareLink}
    />
  );
};

export { ChromeTopBar };
