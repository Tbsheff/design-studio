import { useCallback, useRef } from "react";
import type { RefObject } from "react";

interface MenuItemRefs {
  readonly refs: RefObject<Map<string, HTMLButtonElement>>;
  readonly bind: (id: string) => (element: HTMLButtonElement | null) => void;
}

const useMenuItemRefs = (): MenuItemRefs => {
  const refsHolder = useRef(new Map<string, HTMLButtonElement>());

  const bindersHolder = useRef(
    new Map<string, (element: HTMLButtonElement | null) => void>()
  );

  const bind = useCallback((id: string) => {
    const known = bindersHolder.current.get(id);

    if (known) {
      return known;
    }

    const binder = (element: HTMLButtonElement | null): void => {
      if (element) {
        refsHolder.current.set(id, element);
      } else {
        refsHolder.current.delete(id);
      }
    };

    bindersHolder.current.set(id, binder);

    return binder;
  }, []);

  return { bind, refs: refsHolder };
};

export { useMenuItemRefs };

export type { MenuItemRefs };
