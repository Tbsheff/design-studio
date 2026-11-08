import { useEffect, useState } from "react";

import { findElements } from "./find-element.js";

const readTopModal = (): HTMLDialogElement | null => {
  const top = findElements(document.body, "dialog:modal").at(-1);

  if (top instanceof HTMLDialogElement) {
    return top;
  }

  return null;
};

const useTopModal = (isWatching: boolean): HTMLDialogElement | null => {
  const [modal, setModal] = useState<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (!isWatching) {
      return;
    }

    const check = (): void => setModal(readTopModal());
    check();
    const observer = new MutationObserver(check);

    observer.observe(document.body, {
      attributeFilter: ["open"],
      attributes: true,
      childList: true,
      subtree: true,
    });

    return (): void => {
      observer.disconnect();
      setModal(null);
    };
  }, [isWatching]);

  return modal;
};

export { useTopModal };
