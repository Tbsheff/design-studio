import { useEffect, useState } from "react";

const isTyping = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
};

const isMarginKey = (event: KeyboardEvent): boolean =>
  event.key.toLowerCase() === "m" &&
  !event.metaKey &&
  !event.ctrlKey &&
  !isTyping(event.target);

const useMarginKey = (active: boolean): boolean => {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    const onDown = (event: KeyboardEvent): void => {
      if (isMarginKey(event)) {
        setHeld(true);
      }
    };

    const onUp = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() === "m") {
        setHeld(false);
      }
    };

    const onBlur = (): void => setHeld(false);

    globalThis.addEventListener("keydown", onDown);
    globalThis.addEventListener("keyup", onUp);
    globalThis.addEventListener("blur", onBlur);

    return (): void => {
      globalThis.removeEventListener("keydown", onDown);
      globalThis.removeEventListener("keyup", onUp);
      globalThis.removeEventListener("blur", onBlur);
      setHeld(false);
    };
  }, [active]);

  return held && active;
};

export { useMarginKey };
