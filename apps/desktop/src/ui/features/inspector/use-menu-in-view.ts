import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const useMenuInView = (): RefObject<HTMLDivElement | null> => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest" });
  }, []);

  return ref;
};

export { useMenuInView };
