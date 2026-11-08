import { useCallback } from "react";
import type { MutableRefObject, ReactElement } from "react";

import { tagFrame } from "../../platform/bridge.js";
import { copy } from "./copy.js";

interface PreviewSlotProps {
  readonly token: string;
  readonly src: string;
  readonly position: "front" | "back";
  readonly sandbox?: string;
  readonly viewport: { width: number; height: number };
  readonly elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  readonly onFrameLoad: (token: string) => void;
}

const bindFrameElement = (
  elements: PreviewSlotProps["elements"],
  token: string,
  element: HTMLIFrameElement | null
): void => {
  elements.current[token] = tagFrame(element, token);
};

const PreviewSlot = ({
  token,
  src,
  position,
  sandbox,
  viewport,
  elements,
  onFrameLoad,
}: PreviewSlotProps): ReactElement => {
  const setRef = useCallback(
    (element: HTMLIFrameElement | null): void => {
      bindFrameElement(elements, token, element);
    },
    [elements, token]
  );

  const onLoad = useCallback(
    (): void => onFrameLoad(token),
    [onFrameLoad, token]
  );

  return (
    <iframe
      ref={setRef}
      title={copy.designPreview}
      className={`frame ${position}`}
      src={src}
      onLoad={onLoad}
      sandbox={sandbox}
      width={viewport.width}
      height={viewport.height}
    />
  );
};

export { PreviewSlot };
