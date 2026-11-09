import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { SlotLayout } from "./device-frame-model.js";
import { DeviceFrame } from "./device-frame.js";

interface PlayFrameProps {
  readonly bind: (el: HTMLIFrameElement | null) => void;
  readonly layout: SlotLayout;
  readonly sandbox?: string;
  readonly src: string;
}

const toFrameClass = (layout: SlotLayout): string => {
  if (layout.deviceId === null) {
    return "play-frame";
  }

  return "play-frame has-device";
};

const PlayFrame = ({
  bind,
  layout,
  sandbox,
  src,
}: PlayFrameProps): ReactElement => {
  const frameHeight = layout.outerHeight * layout.scale;
  const frameWidth = layout.outerWidth * layout.scale;

  const frameStyle = useMemo(
    () => ({ height: frameHeight, width: frameWidth }),
    [frameHeight, frameWidth]
  );

  return (
    <div className={toFrameClass(layout)} style={frameStyle}>
      <DeviceFrame layout={layout}>
        <iframe
          ref={bind}
          title={copy.prototypeFrame}
          src={src}
          sandbox={sandbox}
          width={layout.viewWidth}
          height={layout.viewHeight}
        />
      </DeviceFrame>
    </div>
  );
};

export { PlayFrame };
