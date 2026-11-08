import { Icon } from "@design-studio/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import { cachedThumb, requestThumb } from "./versions-api.js";
import type { ThumbLookup, ThumbResult } from "./versions-api.js";

interface Props {
  projectId: string;
  versionId: string;
  active: boolean;
  onOpen: () => void;
}

const THUMB_ICON_SIZE = 14;
const THUMB_WIDTH = 56;
const THUMB_HEIGHT = 36;

const toThumbState = (lookup: ThumbLookup, isLoaded: boolean): string => {
  if (!lookup.isKnown) {
    return "loading";
  }

  if (lookup.result === null) {
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
  onOpen,
}: Props): ReactNode => {
  const ref = useRef<HTMLSpanElement>(null);

  const [lookup, setLookup] = useState<ThumbLookup>(() =>
    cachedThumb(projectId, versionId)
  );

  const { isKnown, result } = lookup;

  const [loaded, setLoaded] = useState(false);
  const inView = useInView(ref, active && !isKnown);
  useEffect(() => {
    if (!inView || isKnown) {
      return;
    }

    return requestThumb(projectId, versionId, (found: ThumbResult): void => {
      setLookup({ isKnown: true, result: found });
    });
  }, [inView, isKnown, projectId, versionId]);

  const state = toThumbState(lookup, loaded);

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
        <img
          src={result}
          alt=""
          width={THUMB_WIDTH}
          height={THUMB_HEIGHT}
          draggable={false}
          onLoad={handleLoad}
        />
      )}
      {result === null && <Icon name="file" size={THUMB_ICON_SIZE} />}
    </span>
  );
};

export { VersionThumb };
