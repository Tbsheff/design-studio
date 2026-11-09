import { useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import type { SlotLayout } from "./device-frame-model.js";

interface DeviceFrameProps {
  readonly children: ReactNode;
  readonly layout: SlotLayout;
}

const toLensClass = (layout: SlotLayout): string | null => {
  if (layout.deviceId === null) {
    return null;
  }

  return `play-device-lens lens-${layout.deviceId} is-${layout.orientation}`;
};

const DeviceFrame = ({ children, layout }: DeviceFrameProps): ReactElement => {
  const lensClass = toLensClass(layout);

  const deviceStyle = useMemo(
    (): CSSProperties => ({
      borderRadius: layout.outerRadius,
      height: layout.outerHeight,
      transform: `scale(${layout.scale})`,
      width: layout.outerWidth,
    }),
    [layout]
  );

  const screenStyle = useMemo(
    (): CSSProperties => ({
      borderRadius: layout.screenRadius,
      height: layout.viewHeight,
      left: layout.left,
      top: layout.top,
      width: layout.viewWidth,
    }),
    [layout]
  );

  return (
    <div
      className="play-device"
      style={deviceStyle}
      data-device={layout.deviceId}
      data-testid="play-device"
    >
      <div className="play-device-screen" style={screenStyle}>
        {children}
      </div>
      {lensClass && <span className={lensClass} aria-hidden="true" />}
    </div>
  );
};

export { DeviceFrame };
