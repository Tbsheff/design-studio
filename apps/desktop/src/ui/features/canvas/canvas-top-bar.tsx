import { Suspense, useCallback, useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import { copy } from "./copy.js";
import { lazyPortToAppDialog, usePortDialog } from "./top-bar-drop-menu.js";
import { TopBarEnd } from "./top-bar-end.js";
import type { MenuEntry, PresentMode } from "./top-bar-menu-model.js";
import type { Props } from "./top-bar-props.js";
import { TopBarStart } from "./top-bar-start.js";
import { TopBarTools } from "./top-bar-tools.js";
import type { ZoomProps } from "./top-bar-zoom-model.js";
import { ZoomPill } from "./top-bar-zoom.js";

const CONTENTS_STYLE: CSSProperties = { display: "contents" };

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

const PortToAppDialog = lazyPortToAppDialog;

const CanvasTopBar = (props: Props): ReactElement => {
  const port = usePortDialog(!props.onShip);
  const { open: openPort, close: closePort } = port;
  const hasShip = Boolean(props.onShip);
  const openPortDialog = useCallback((): void => openPort(null), [openPort]);
  const present = presentItems(props.onPresent);

  const {
    onFit: fit,
    onZoomStep: step,
    onZoomTo: zoomTo,
    zoomSetting,
    zoom: zoomStore,
  } = props;

  const zoom = useMemo<ZoomProps>(
    () => ({
      onFit: fit,
      onStep: step,
      onZoomTo: zoomTo,
      setting: zoomSetting,
      zoom: zoomStore,
    }),
    [fit, step, zoomTo, zoomSetting, zoomStore]
  );

  let onPort: (() => void) | null = null;

  if (!hasShip) {
    onPort = openPortDialog;
  }

  return (
    <div
      className="toolbar canvas-topbar"
      role="toolbar"
      aria-label={copy.canvas}
    >
      <TopBarStart props={props} />
      <div className="spacer" />
      <ZoomPill control={zoom} />
      <TopBarTools
        tool={props.tool}
        commentAvailable={props.commentAvailable}
        onTool={props.onTool}
      />
      {props.vectorTools}
      {props.matrix}
      <span data-topbar-slot="review" style={CONTENTS_STYLE} />
      <TopBarEnd props={props} zoom={zoom} present={present} onPort={onPort} />
      {port.target && (
        <Suspense fallback={null}>
          <PortToAppDialog target={port.target} onClose={closePort} />
        </Suspense>
      )}
    </div>
  );
};

export { CanvasTopBar };
