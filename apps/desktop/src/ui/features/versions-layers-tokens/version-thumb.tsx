import { Icon } from "@design-studio/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import { cachedThumb, requestThumb } from "./versions-api.js";
import type { ThumbResult } from "./versions-api.js";

interface Props {
  projectId: string;
  versionId: string;
  active: boolean;
  label: string;
  onOpen: () => void;
}

const THUMB_ICON_SIZE = 14;

const toThumbState = (
  result: ThumbResult | undefined,
  isLoaded: boolean
): string => {
  if (result === undefined) {
    return "loading";
  }

  if (result === null) {
    return "none";
  }

  if (isLoaded) {
    return "ready";
  }

  return "loading";
};

const useInView = (
  ref: RefObject<HTMLElement | null>,
  enabled: boolean
): boolean => {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const element = ref.current;

    if (!enabled || !element) {
      setSeen(false);

      return;
    }

    const observer = new IntersectionObserver(
      (entries) => setSeen(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: "64px 0px" }
    );

    observer.observe(element);

    return (): void => observer.disconnect();
  }, [ref, enabled]);

  return seen;
};

const VersionThumb = ({
  projectId,
  versionId,
  active,
  label,
  onOpen,
}: Props): ReactNode => {
  const ref = useRef<HTMLSpanElement>(null);

  const [result, setResult] = useState<ThumbResult | undefined>(() =>
    cachedThumb(projectId, versionId)
  );

  const [loaded, setLoaded] = useState(false);
  const inView = useInView(ref, active && result === undefined);
  useEffect(() => {
    if (!inView || result !== undefined) {
      return;
    }

    return requestThumb(projectId, versionId, setResult);
  }, [inView, result, projectId, versionId]);

  const state = toThumbState(result, loaded);

  const handleLoad = useCallback((): void => {
    setLoaded(true);
  }, []);

  return (
    <span
      ref={ref}
      className={`version-thumb ${state}`}
      data-testid="version-thumb"
      data-state={state}
      aria-hidden="true"
      onClick={onOpen}
    >
      {result && (
        <img src={result} alt="" draggable={false} onLoad={handleLoad} />
      )}
      {result === null && <Icon name="file" size={THUMB_ICON_SIZE} />}
    </span>
  );
};

export { VersionThumb };
