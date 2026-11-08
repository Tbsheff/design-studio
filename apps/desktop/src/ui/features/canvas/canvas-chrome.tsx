import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";

import { uiStore } from "../../platform/storage.js";
import { useFileMenu } from "./canvas-chrome-menu.js";
import type { ChromeProps } from "./canvas-chrome-menu.js";
import { PresentLayer, TweakPrompt } from "./canvas-overlays.js";
import { fileNameOf, reloadFrames, scopeOf, toolOf } from "./canvas-shell.js";
import type { CanvasShell } from "./canvas-shell.js";
import { CanvasViewRow, VectorToolButtons } from "./canvas-toolbar.js";
import { CanvasTopBar } from "./canvas-top-bar.js";
import type { CanvasTool, PresentMode } from "./top-bar-menu.js";
import { isTypingTarget } from "./use-pan-zoom.js";

const NOOP = (): null => null;

const toggleRulers = (): void => uiStore.set((st) => ({ rulers: !st.rulers }));

const useRulersKey = (): void => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (
        event.code !== "KeyR" ||
        !event.shiftKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.repeat ||
        isTypingTarget(event.target)
      ) {
        return;
      }

      if (document.querySelector(".play-layer, .present-layer")) {
        return;
      }

      event.preventDefault();
      toggleRulers();
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, []);
};

const barShell = (
  shell: CanvasShell | undefined
):
  | CanvasShell
  | {
      canExport: boolean;
      directionName: null;
      onExpandPane: () => null;
      onExport: () => null;
      onShareLink: null;
      onShip: null;
      paneCollapsed: boolean;
    } => {
  if (!shell) {
    return {
      canExport: false,
      directionName: null,
      onExpandPane: NOOP,
      onExport: NOOP,
      onShareLink: null,
      onShip: null,
      paneCollapsed: false,
    };
  }

  return shell;
};

const CanvasChrome = (chromeProps: ChromeProps): ReactElement => {
  const [present, setPresent] = useState<Exclude<
    PresentMode,
    "new-window" | "play"
  > | null>(null);

  const [tweakOpen, setTweakOpen] = useState(false);
  const closePresent = useCallback(() => setPresent(null), []);
  const closeTweak = useCallback(() => setTweakOpen(false), []);
  const [importing, setImporting] = useState(false);
  const closeImport = useCallback(() => setImporting(false), []);
  const file = useFileMenu(chromeProps, () => setImporting(true));
  useRulersKey();
  const { shell } = chromeProps;

  const viewOpen =
    chromeProps.ui.viewRowOpen || chromeProps.view.source.kind === "version";

  const onTool = (next: Exclude<CanvasTool, null>): void => {
    if (next === "prototype") {
      return chromeProps.proto.set(!chromeProps.proto.on);
    }

    const leavingProto = chromeProps.proto.on;
    chromeProps.proto.set(false);

    if (next === "edit" && leavingProto && shell?.pane === "design") {
      return;
    }

    if (next === "comment") {
      return chromeProps.comment.toggle();
    }

    if (next === "edit") {
      return chromeProps.toggleEdit();
    }

    const editing = shell?.pane === "design";
    chromeProps.comment.setOn(false);

    if (editing) {
      shell?.onPane("chat");
    }

    chromeProps.setSelectMode((match) => editing || !match);
  };

  const onPresent = (mode: PresentMode): void => {
    if (mode === "play") {
      return chromeProps.proto.play();
    }

    if (!chromeProps.presentUrl) {
      return;
    }

    if (mode === "new-window") {
      globalThis.open(chromeProps.presentUrl, "_blank", "noopener");
    } else {
      setPresent(mode);
    }
  };

  const onTweak = shell?.onTweak ?? null;
  const bar = barShell(shell);

  return (
    <>
      <CanvasTopBar
        shapeTools={<VectorToolButtons />}
        matrix={chromeProps.matrix}
        paneCollapsed={bar.paneCollapsed}
        onExpandPane={bar.onExpandPane}
        onReload={() => reloadFrames(chromeProps.stage())}
        tweakOpen={tweakOpen}
        tweakDisabled={!onTweak || !chromeProps.live}
        onTweak={() => setTweakOpen((value) => !value)}
        fileName={fileNameOf(
          chromeProps.active,
          chromeProps.kind,
          bar.directionName
        )}
        fileMenu={file.groups}
        onFileMenuOpen={file.load}
        zoom={chromeProps.zoom.zoomPercent}
        zoomSetting={chromeProps.ui.zoom}
        onZoomTo={chromeProps.zoom.zoomTo}
        onZoomStep={chromeProps.zoom.zoomStep}
        onFit={chromeProps.zoom.fit}
        tool={toolOf(
          shell?.pane,
          chromeProps.comment.on,
          chromeProps.selectMode,
          chromeProps.proto.on
        )}
        commentAvailable={chromeProps.comment.available}
        onTool={onTool}
        viewOpen={viewOpen}
        onToggleView={() =>
          uiStore.set((st) => ({ viewRowOpen: !st.viewRowOpen }))
        }
        onPresent={onPresent}
        presentDisabled={!chromeProps.presentUrl}
        canExport={bar.canExport}
        onExport={bar.onExport}
        onShip={bar.onShip ?? null}
        onShareLink={bar.onShareLink ?? null}
      />
      {tweakOpen && onTweak && (
        <TweakPrompt
          scope={scopeOf(chromeProps.selection)}
          onSend={onTweak}
          onClose={closeTweak}
        />
      )}
      {viewOpen && (
        <CanvasViewRow
          viewport={chromeProps.ui.viewport}
          {...chromeProps.view}
          rulers={{ on: chromeProps.ui.rulers, onToggle: toggleRulers }}
        />
      )}
      {importing &&
        chromeProps.directionId &&
        chromeProps.importPage.render(closeImport)}
      {present && chromeProps.presentUrl && (
        <PresentLayer
          url={chromeProps.presentUrl}
          sandbox={chromeProps.sandbox}
          fullscreen={present === "fullscreen"}
          onClose={closePresent}
        />
      )}
    </>
  );
};

export { CanvasChrome };
