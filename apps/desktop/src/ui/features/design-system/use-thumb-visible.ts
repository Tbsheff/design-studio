import { useEffect, useState } from "react";
import type { RefObject } from "react";

const ROOT_MARGIN = "160px 0px";

const useThumbVisible = (
  ref: RefObject<HTMLElement | null>,
  active: boolean
): boolean => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node || !active || visible) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
        }
      },
      { rootMargin: ROOT_MARGIN }
    );

    observer.observe(node);

    return (): void => observer.disconnect();
  }, [ref, active, visible]);

  return visible;
};

export { useThumbVisible };
