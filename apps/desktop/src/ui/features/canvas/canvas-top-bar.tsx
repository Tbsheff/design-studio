import { Icon } from "@design-studio/ui";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { tipWithKey } from "../../canvas-toolbar-slots.js";
import type { LiveStore } from "../../platform/live-store.js";
import type { ZoomSetting } from "../../platform/storage.js";
import { copy } from "./copy.js";
import {
  PortToAppDialog,
  usePortDialog,
  DropMenu,
} from "./top-bar-drop-menu.js";
import { shareGroups } from "./top-bar-menu.js";
import type {
  CanvasTool,
  PresentMode,
  MenuEntry,
  MenuGroup,
} from "./top-bar-menu.js";
import { ZoomPill, OverflowMenu } from "./top-bar-zoom.js";
import type { ZoomProps } from "./top-bar-zoom.js";

interface Props {
  shapeTools?: ReactNode;
  matrix?: ReactNode;
  paneCollapsed: boolean;
  onExpandPane: () => void;
  onReload: () => void;
  tweakOpen: boolean;
  onTweak: () => void;
  tweakDisabled: boolean;
  fileName: string;
  fileMenu: () => MenuGroup[];
  onFileMenuOpen: () => void;
  zoom: LiveStore<number>;
  zoomSetting: ZoomSetting;
  onZoomTo: (z: number) => void;
  onZoomStep: (d: 1 | -1) => void;
  onFit: () => void;
  tool: CanvasTool;
  commentAvailable: boolean;
  onTool: (tool: Exclude<CanvasTool, null>) => void;
  viewOpen: boolean;
  onToggleView: () => void;
  onPresent: (mode: PresentMode) => void;
  presentDisabled: boolean;
  canExport: boolean;
  onExport: () => void;
  onShip?: (() => void) | null;
  onShareLink?: ((mode?: "link" | "publish") => void) | null;
}

function presentItems(onPresent: (mode: PresentMode) => void): MenuEntry[] {
  return [
    {
      icon: "link",
      id: "play",
      label: "Play prototype",
      run: () => onPresent("play"),
    },
    {
      icon: "play",
      id: "window",
      label: "In this window",
      run: () => onPresent("window"),
    },
    {
      icon: "expand",
      id: "fullscreen",
      label: "Fullscreen",
      run: () => onPresent("fullscreen"),
    },
    {
      icon: "window",
      id: "new-window",
      label: "New window",
      run: () => onPresent("new-window"),
    },
  ];
}

export function CanvasTopBar(p: Props) {
  const port = usePortDialog(!p.onShip);
  const onPort = p.onShip ? null : () => port.open(null);
  const present = presentItems(p.onPresent);

  const zoom: ZoomProps = {
    onFit: p.onFit,
    onStep: p.onZoomStep,
    onZoomTo: p.onZoomTo,
    setting: p.zoomSetting,
    zoom: p.zoom,
  };

  return (
    <div
      className="toolbar canvas-topbar"
      role="toolbar"
      aria-label={copy.canvas}
    >
      {p.paneCollapsed && (
        <button
          type="button"
          className="icon-btn topbar-icon"
          aria-label={copy.showChatPane}
          data-tip={copy.showPane}
          data-tip-align="start"
          onClick={p.onExpandPane}
        >
          <Icon name="sidebar" size={14} />
        </button>
      )}
      <button
        type="button"
        className="icon-btn topbar-icon topbar-fold-wide"
        aria-label={copy.reloadPreview}
        data-tip={copy.reload}
        data-tip-align="start"
        onClick={p.onReload}
      >
        <Icon name="reload" size={14} />
      </button>
      <button
        type="button"
        className="icon-btn topbar-icon topbar-fold-narrow"
        aria-label={copy.tweak}
        aria-pressed={p.tweakOpen}
        aria-expanded={p.tweakOpen}
        disabled={p.tweakDisabled}
        data-tip={p.tweakOpen ? undefined : "Describe a tweak"}
        onClick={p.onTweak}
      >
        <Icon name="sliders" size={14} />
      </button>
      <DropMenu
        label="Pages and frames"
        className="topbar-file"
        groups={p.fileMenu}
        onOpen={p.onFileMenuOpen}
        tip="Pages and frames"
      >
        <span className="truncate">{p.fileName}</span>
        <Icon name="chevronDown" size={12} />
      </DropMenu>
      <button
        type="button"
        className="icon-btn topbar-icon topbar-fold-wide"
        aria-label={copy.viewOptions}
        aria-pressed={p.viewOpen}
        data-tip={copy.sizeSourceAnd}
        onClick={p.onToggleView}
      >
        <Icon name="more" size={14} />
      </button>
      <div className="spacer" />
      <ZoomPill {...zoom} />
      <div
        className="ui-tools topbar-tools"
        role="group"
        aria-label={copy.tool}
      >
        <button
          type="button"
          aria-label={copy.select}
          aria-pressed={p.tool === "select"}
          aria-keyshortcuts="V"
          data-tip={tipWithKey("Select elements", "tool-select")}
          onClick={() => p.onTool("select")}
        >
          <Icon name="pointer" size={14} />
          <span>Select</span>
        </button>
        <button
          type="button"
          aria-label={copy.comment}
          aria-pressed={p.tool === "comment"}
          aria-keyshortcuts="C"
          disabled={!p.commentAvailable}
          data-tip={
            p.commentAvailable
              ? tipWithKey("Comment", "tool-comment")
              : "Comments work on the live preview"
          }
          onClick={() => p.onTool("comment")}
        >
          <Icon name="comment" size={14} />
          <span>Comment</span>
        </button>
        <button
          type="button"
          aria-label={copy.edit}
          aria-pressed={p.tool === "edit"}
          aria-keyshortcuts="Alt+1"
          data-tip={tipWithKey("Edit and layers", "layers")}
          onClick={() => p.onTool("edit")}
        >
          <Icon name="edit" size={14} />
          <span>Edit</span>
        </button>
        <button
          type="button"
          aria-label={copy.prototype}
          aria-pressed={p.tool === "prototype"}
          data-tip={copy.linkElementsTo}
          onClick={() => p.onTool("prototype")}
        >
          <Icon name="link" size={14} />
          <span>Prototype</span>
        </button>
      </div>
      {p.shapeTools}
      {p.matrix}
      <span data-topbar-slot="review" style={{ display: "contents" }} />
      <DropMenu
        label="Present"
        className="btn ghost topbar-present"
        anchorClass="topbar-fold-wide"
        groups={() => [{ items: present }]}
        align="end"
        tip="Present"
      >
        <Icon name="play" size={14} />
        <span className="topbar-label">Present</span>
        <Icon name="chevronDown" size={12} />
      </DropMenu>
      <OverflowMenu
        zoom={zoom}
        present={present}
        viewOpen={p.viewOpen}
        onToggleView={p.onToggleView}
        onReload={p.onReload}
        tweak={{ disabled: p.tweakDisabled, open: p.tweakOpen, run: p.onTweak }}
      />
      <DropMenu
        label="Share"
        className="btn strong topbar-share"
        groups={() => shareGroups(p, onPort)}
        align="end"
        tip={
          p.onShip
            ? "Export, or ship as a pull request"
            : "Export images, files or a handoff"
        }
      >
        <Icon name="share" size={14} />
        <span className="topbar-label">Share</span>
        <Icon name="chevronDown" size={12} />
      </DropMenu>
      <span
        className="topbar-avatar"
        role="img"
        aria-label={copy.youOnThis}
        data-tip={copy.youOnThis}
        data-tip-align="end"
      >
        Y
      </span>
      {port.target && (
        <Suspense fallback={null}>
          <PortToAppDialog target={port.target} onClose={port.close} />
        </Suspense>
      )}
    </div>
  );
}
