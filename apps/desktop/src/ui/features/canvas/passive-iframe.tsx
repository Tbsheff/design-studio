import { useCallback, useState } from "react";
import type { ReactElement } from "react";

interface PassiveIframeProps {
  readonly url: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly frameId: string;
  readonly isNext: boolean;
  readonly sandbox?: string;
  readonly frameRef: ((el: HTMLIFrameElement | null) => void) | null;
  readonly onNextLoad: (id: string) => void;
}

const IFRAME_CLASS = ["frame passive", "frame passive next"];

const LOAD_CLASS = [" loading", ""];

const PassiveIframe = ({
  url,
  name,
  width,
  height,
  frameId,
  isNext,
  sandbox,
  frameRef,
  onNextLoad,
}: PassiveIframeProps): ReactElement => {
  const [isLoaded, setIsLoaded] = useState(false);

  const onLoad = useCallback((): void => {
    setIsLoaded(true);

    if (isNext) {
      onNextLoad(frameId);
    }
  }, [frameId, isNext, onNextLoad]);

  return (
    <iframe
      ref={frameRef}
      title={`${name} preview`}
      className={`${IFRAME_CLASS[Number(isNext)]}${LOAD_CLASS[Number(isLoaded)]}`}
      src={url}
      sandbox={sandbox}
      width={width}
      height={height}
      tabIndex={-1}
      onLoad={onLoad}
    />
  );
};

export { PassiveIframe };
