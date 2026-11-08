import { Icon } from "@design-studio/ui";
import { Suspense } from "react";
import type { ReactNode, ReactElement } from "react";

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
  onZoomTo: (zoomValue: number) => void;
  onZoomStep: (delta: 1 | -1) => void;
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

const presentItems = (onPresent: (mode: PresentMode) => void): MenuEntry[] => [
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

const CanvasTopBar = (props: Props): ReactElement => {
  const port = usePortDialog(!props.onShip);

  let onPort: (() => void) | null = null;

  if (!props.onShip) {
    onPort = (): void => port.open(null);
  }
  const present = presentItems(props.onPresent);

  const zoom: ZoomProps = {
    onFit: props.onFit,
    onStep: props.onZoomStep,
    onZoomTo: props.onZoomTo,
    setting: props.zoomSetting,
    zoom: props.zoom,
  };

  const datatip: "Describe a tweak" | undefined = (():
    | "Describe a tweak"
    | undefined => {
    if (props.tweakOpen) {
      return undefined;
    }
    return "Describe a tweak";
  })();

  let datatip2 = "Comments work on the live preview";

  if (props.commentAvailable) {
    datatip2 = tipWithKey("Comment", "tool-comment");
  }

  let tip2:
    | "Export, or ship as a pull request"
    | "Export images, files or a handoff" = "Export images, files or a handoff";

  if (props.onShip) {
    tip2 = "Export, or ship as a pull request";
  }

  return (
    <div
      className="toolbar canvas-topbar"
      role="toolbar"
      aria-label={copy.canvas}
    >
      {props.paneCollapsed && (
        <button
          type="button"
          className="icon-btn topbar-icon"
          aria-label={copy.showChatPane}
          data-tip={copy.showPane}
          data-tip-align="start"
          onClick={props.onExpandPane}
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
        onClick={props.onReload}
      >
        <Icon name="reload" size={14} />
      </button>
      <button
        type="button"
        className="icon-btn topbar-icon topbar-fold-narrow"
        aria-label={copy.tweak}
        aria-pressed={props.tweakOpen}
        aria-expanded={props.tweakOpen}
        disabled={props.tweakDisabled}
        data-tip={datatip}
        onClick={props.onTweak}
      >
        <Icon name="sliders" size={14} />
      </button>
      <DropMenu
        label="Pages and frames"
        className="topbar-file"
        groups={props.fileMenu}
        onOpen={props.onFileMenuOpen}
        tip="Pages and frames"
      >
        <span className="truncate">{props.fileName}</span>
        <Icon name="chevronDown" size={12} />
      </DropMenu>
      <button
        type="button"
        className="icon-btn topbar-icon topbar-fold-wide"
        aria-label={copy.viewOptions}
        aria-pressed={props.viewOpen}
        data-tip={copy.sizeSourceAnd}
        onClick={props.onToggleView}
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
          aria-pressed={props.tool === "select"}
          aria-keyshortcuts="V"
          data-tip={tipWithKey("Select elements", "tool-select")}
          onClick={() => props.onTool("select")}
        >
          <Icon name="pointer" size={14} />
          <span>{copy.select}</span>
        </button>
        <button
          type="button"
          aria-label={copy.comment}
          aria-pressed={props.tool === "comment"}
          aria-keyshortcuts="C"
          disabled={!props.commentAvailable}
          data-tip={datatip2}
          onClick={() => props.onTool("comment")}
        >
          <Icon name="comment" size={14} />
          <span>{copy.comment}</span>
        </button>
        <button
          type="button"
          aria-label={copy.edit}
          aria-pressed={props.tool === "edit"}
          aria-keyshortcuts="Alt+1"
          data-tip={tipWithKey("Edit and layers", "layers")}
          onClick={() => props.onTool("edit")}
        >
          <Icon name="edit" size={14} />
          <span>{copy.edit}</span>
        </button>
        <button
          type="button"
          aria-label={copy.prototype}
          aria-pressed={props.tool === "prototype"}
          data-tip={copy.linkElementsTo}
          onClick={() => props.onTool("prototype")}
        >
          <Icon name="link" size={14} />
          <span>{copy.prototype}</span>
        </button>
      </div>
      {props.shapeTools}
      {props.matrix}
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
        <span className="topbar-label">{copy.present}</span>
        <Icon name="chevronDown" size={12} />
      </DropMenu>
      <OverflowMenu
        zoom={zoom}
        present={present}
        viewOpen={props.viewOpen}
        onToggleView={props.onToggleView}
        onReload={props.onReload}
        tweak={{
          disabled: props.tweakDisabled,
          open: props.tweakOpen,
          run: props.onTweak,
        }}
      />
      <DropMenu
        label="Share"
        className="btn strong topbar-share"
        groups={() => shareGroups(props, onPort)}
        align="end"
        tip={tip2}
      >
        <Icon name="share" size={14} />
        <span className="topbar-label">{copy.share}</span>
        <Icon name="chevronDown" size={12} />
      </DropMenu>
      <span
        className="topbar-avatar"
        role="img"
        aria-label={copy.youOnThis}
        data-tip={copy.youOnThis}
        data-tip-align="end"
      >
        {copy.keyY}
      </span>
      {port.target && (
        <Suspense fallback={null}>
          <PortToAppDialog target={port.target} onClose={port.close} />
        </Suspense>
      )}
    </div>
  );
};

export { CanvasTopBar };
