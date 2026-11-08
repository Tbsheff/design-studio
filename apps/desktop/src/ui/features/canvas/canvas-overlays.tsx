import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect, useEffectEvent, useRef } from "react";

import { copy } from "./copy.js";
import { toValueOr } from "./settle-model.js";

const PresentLayer = ({
  url,
  sandbox,
  fullscreen,
  onClose,
}: {
  url: string;
  sandbox?: string;
  fullscreen: boolean;
  onClose: () => void;
}): ReactElement => {
  const root = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const el = root.current;

    if (fullscreen && el?.requestFullscreen) {
      void toValueOr(el.requestFullscreen(), null);
    }

    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    };

    const onFullscreen = (): void => {
      if (fullscreen && !document.fullscreenElement) {
        close();
      }
    };

    globalThis.addEventListener("keydown", onKey, true);
    document.addEventListener("fullscreenchange", onFullscreen);
    closeButton.current?.focus();

    return (): void => {
      globalThis.removeEventListener("keydown", onKey, true);
      document.removeEventListener("fullscreenchange", onFullscreen);

      if (document.fullscreenElement) {
        void toValueOr(document.exitFullscreen(), null);
      }
    };
  }, [fullscreen]);

  return (
    <dialog
      ref={root}
      open
      className="present-layer"
      aria-modal="true"
      aria-label={copy.present}
    >
      <iframe
        className="present-frame"
        title={copy.presentedDesign}
        src={url}
        sandbox={sandbox}
      />
      <button
        ref={closeButton}
        type="button"
        className="btn small present-close"
        onClick={onClose}
      >
        <Icon name="close" size={12} />
        {copy.exit}
        <kbd>{copy.esc}</kbd>
      </button>
    </dialog>
  );
};

export { PresentLayer };
