import { useCallback, useEffect, useState } from "react";

import { ImportPageSlot } from "../../canvas-slots.js";
import {
  CanvasViewRow,
  VectorToolButtons,
} from "../../components/CanvasToolbar.js";
import { CanvasTopBar } from "../../components/CanvasTopBar.js";
import type { CanvasTool, PresentMode } from "../../components/CanvasTopBar.js";
import { uiStore } from "../../storage.js";
import { isTypingTarget } from "../../usePanZoom.js";
import { useFileMenu } from "./canvas-chrome-menu.js";
import type { ChromeProps } from "./canvas-chrome-menu.js";
import { PresentLayer, TweakPrompt } from "./canvas-overlays.js";
import { fileNameOf, reloadFrames, scopeOf, toolOf } from "./canvas-shell.js";
import type { CanvasShell } from "./canvas-shell.js";

const NOOP = () => undefined;

const toggleRulers = () => uiStore.set((st) => ({ rulers: !st.rulers }));

function useRulersKey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.code !== "KeyR" ||
        !e.shiftKey ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.repeat ||
        isTypingTarget(e.target)
      ) {
        return;
      }

      if (document.querySelector(".play-layer, .present-layer")) {
        return;
      }

      e.preventDefault();
      toggleRulers();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function barShell(shell: CanvasShell | undefined) {
  if (!shell) {
    return {
      paneCollapsed: false,
      onExpandPane: NOOP,
      canExport: false,
      onExport: NOOP,
      directionName: null,
      onShip: null,
      onShareLink: null,
    };
  }

  return shell;
}

function CanvasChrome(p: ChromeProps) {
  const [present, setPresent] = useState<Exclude<
    PresentMode,
    "new-window" | "play"
  > | null>(null);

  const [tweakOpen, setTweakOpen] = useState(false);
  const closePresent = useCallback(() => setPresent(null), []);
  const closeTweak = useCallback(() => setTweakOpen(false), []);
  const [importing, setImporting] = useState(false);
  const closeImport = useCallback(() => setImporting(false), []);
  const file = useFileMenu(p, () => setImporting(true));
  useRulersKey();
  const shell = p.shell;
  const viewOpen = p.ui.viewRowOpen || p.view.source.kind === "version";

  const onTool = (next: Exclude<CanvasTool, null>) => {
    if (next === "prototype") {
      return p.proto.set(!p.proto.on);
    }

    const leavingProto = p.proto.on;
    p.proto.set(false);

    if (next === "edit" && leavingProto && shell?.pane === "design") {
      return;
    }

    if (next === "comment") {
      return p.comment.toggle();
    }

    if (next === "edit") {
      return p.toggleEdit();
    }

    const editing = shell?.pane === "design";
    p.comment.setOn(false);

    if (editing) {
      shell?.onPane("chat");
    }

    p.setSelectMode((m) => editing || !m);
  };

  const onPresent = (mode: PresentMode) => {
    if (mode === "play") {
      return p.proto.play();
    }

    if (!p.presentUrl) {
      return;
    }

    if (mode === "new-window") {
      window.open(p.presentUrl, "_blank", "noopener");
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
        matrix={p.matrix}
        paneCollapsed={bar.paneCollapsed}
        onExpandPane={bar.onExpandPane}
        onReload={() => reloadFrames(p.stage())}
        tweakOpen={tweakOpen}
        tweakDisabled={!onTweak || !p.live}
        onTweak={() => setTweakOpen((v) => !v)}
        fileName={fileNameOf(p.active, p.kind, bar.directionName)}
        fileMenu={file.groups}
        onFileMenuOpen={file.load}
        zoom={p.zoom.zoomPercent}
        zoomSetting={p.ui.zoom}
        onZoomTo={p.zoom.zoomTo}
        onZoomStep={p.zoom.zoomStep}
        onFit={p.zoom.fit}
        tool={toolOf(shell?.pane, p.comment.on, p.selectMode, p.proto.on)}
        commentAvailable={p.comment.available}
        onTool={onTool}
        viewOpen={viewOpen}
        onToggleView={() =>
          uiStore.set((st) => ({ viewRowOpen: !st.viewRowOpen }))
        }
        onPresent={onPresent}
        presentDisabled={!p.presentUrl}
        canExport={bar.canExport}
        onExport={bar.onExport}
        onShip={bar.onShip ?? null}
        onShareLink={bar.onShareLink ?? null}
      />
      {tweakOpen && onTweak && (
        <TweakPrompt
          scope={scopeOf(p.selection)}
          onSend={onTweak}
          onClose={closeTweak}
        />
      )}
      {viewOpen && (
        <CanvasViewRow
          viewport={p.ui.viewport}
          {...p.view}
          rulers={{ on: p.ui.rulers, onToggle: toggleRulers }}
        />
      )}
      {importing && p.directionId && (
        <ImportPageSlot
          projectId={p.projectId}
          directionId={p.directionId}
          frames={p.frames}
          zoom={p.zoom}
          onClose={closeImport}
        />
      )}
      {present && p.presentUrl && (
        <PresentLayer
          url={p.presentUrl}
          sandbox={p.sandbox}
          fullscreen={present === "fullscreen"}
          onClose={closePresent}
        />
      )}
    </>
  );
}

export { CanvasChrome };
