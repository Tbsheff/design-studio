import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";

const useThemeMenuDismiss = (
  menu: RefObject<HTMLElement | null>,
  trigger: RefObject<HTMLElement | null>,
  onClose: (refocus: boolean) => void
): void => {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    menu.current
      ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      ?.focus();

    const onDown = (event: MouseEvent): void => {
      const { target } = event;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        !menu.current?.contains(target) &&
        !trigger.current?.contains(target)
      ) {
        close(false);
      }
    };

    document.addEventListener("mousedown", onDown);

    return (): void => document.removeEventListener("mousedown", onDown);
  }, [menu, trigger]);
};

export { useThemeMenuDismiss };
