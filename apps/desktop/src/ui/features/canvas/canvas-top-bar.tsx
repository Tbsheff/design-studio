import { Suspense, useCallback, useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";

import type { TopBarHosts } from "./canvas-shell.js";
import { copy } from "./copy.js";
import { TopBarConnect } from "./top-bar-connect.js";
import { lazyPortToAppDialog, usePortDialog } from "./top-bar-drop-menu.js";
import { TopBarFileMenu } from "./top-bar-file-menu.js";
import type { MenuEntry, PresentMode } from "./top-bar-menu-model.js";
import { TopBarPresent } from "./top-bar-present.js";
import type { Props } from "./top-bar-props.js";
import { TopBarShare } from "./top-bar-share.js";
import { TopBarTools } from "./top-bar-tools.js";
import type { ZoomProps } from "./top-bar-zoom-model.js";
import { ZoomControl } from "./zoom-control.js";

const CONTENTS_STYLE: CSSProperties = { display: "contents" };

const presentItems = (onPresent: (mode: PresentMode) => void): MenuEntry[] => [
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
  {
    icon: "link",
    id: "play",
    label: "Play prototype",
    run: () => onPresent("play"),
  },
];

const PortToAppDialog = lazyPortToAppDialog;

interface TopBarParts {
  readonly end: ReactNode;
  readonly start: ReactNode;
  readonly tools: ReactNode;
  readonly zoom: ReactNode;
}

const toHosted = (
  parts: TopBarParts,
  hosts: TopBarHosts | null
): ReactElement => {
  if (hosts) {
    return (
      <>
        {createPortal(parts.start, hosts.start)}
        {createPortal(parts.tools, hosts.tools)}
        {createPortal(parts.zoom, hosts.zoom)}
        {createPortal(parts.end, hosts.end)}
      </>
    );
  }

  return (
    <div
      className="toolbar canvas-topbar"
      role="toolbar"
      aria-label={copy.canvas}
    >
      {parts.start}
      <div className="spacer" />
      {parts.tools}
      {parts.zoom}
      <div className="spacer" />
      {parts.end}
    </div>
  );
};

const CanvasTopBar = (props: Props): ReactElement => {
  const port = usePortDialog(!props.onShip);
  const { open: openPort, close: closePort } = port;
  const hasShip = Boolean(props.onShip);
  const openPortDialog = useCallback((): void => openPort(null), [openPort]);
  const { canPlay, onPresent } = props;
  const present = useMemo(() => presentItems(onPresent), [onPresent]);
  const onPlay = useCallback((): void => onPresent("play"), [onPresent]);

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

  const parts: TopBarParts = {
    end: (
      <>
        {props.matrix}
        <span data-topbar-slot="review" style={CONTENTS_STYLE} />
        <TopBarPresent canPlay={canPlay} onPlay={onPlay} present={present} />
        <TopBarConnect />
        <TopBarShare props={props} onPort={onPort} />
        {props.account}
        {port.target && (
          <Suspense fallback={null}>
            <PortToAppDialog target={port.target} onClose={closePort} />
          </Suspense>
        )}
      </>
    ),
    start: <TopBarFileMenu props={props} />,
    tools: (
      <TopBarTools
        tool={props.tool}
        commentAvailable={props.commentAvailable}
        vectorAvailable={props.vectorAvailable}
        onTool={props.onTool}
      />
    ),
    zoom: <ZoomControl control={zoom} theme={props.theme} />,
  };

  return <>{toHosted(parts, props.hosts)}</>;
};

export { CanvasTopBar };
