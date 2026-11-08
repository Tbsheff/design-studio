import type {
  BridgeToParent,
  SelectionContext,
} from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { formatMeasure } from "../../../shared/measure.js";
import { copy } from "./copy.js";
import { guideStyle } from "./overlay-styles.js";
import { toValueOr } from "./settle-model.js";
import type { SpacingBadge } from "./snap-model.js";
import { frameSnapStore } from "./use-frame-resize.js";

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
  const root = useRef<HTMLDivElement>(null);
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
      onClose();
    };

    const onFullscreen = (): void => {
      if (fullscreen && !document.fullscreenElement) {
        onClose();
      }
    };

    globalThis.addEventListener("keydown", onKey, true);
    document.addEventListener("fullscreenchange", onFullscreen);
    root.current?.querySelector<HTMLButtonElement>(".present-close")?.focus();

    return (): void => {
      globalThis.removeEventListener("keydown", onKey, true);
      document.removeEventListener("fullscreenchange", onFullscreen);

      if (document.fullscreenElement) {
        void toValueOr(document.exitFullscreen(), null);
      }
    };
  }, [fullscreen, onClose]);

  return (
    <div
      ref={root}
      className="present-layer"
      role="dialog"
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
        type="button"
        className="btn small present-close"
        onClick={onClose}
      >
        <Icon name="close" size={12} />
        {copy.exit}
        <kbd>{copy.esc}</kbd>
      </button>
    </div>
  );
};

const TweakPrompt = ({
  scope,
  onSend,
  onClose,
}: {
  scope: string | null;
  onSend: (text: string) => void;
  onClose: () => void;
}): ReactElement => {
  const [text, setText] = useState("");
  const root = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      const target = event.target as Element;

      if (
        !root.current?.contains(target) &&
        !target.closest?.('[aria-label="Tweak"]')
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", onDown);

    return (): void => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const send = (): void => {
    const prompt = text.trim();

    if (!prompt) {
      return;
    }

    onSend(prompt);
    setText("");
    onClose();
  };

  let placeholder2 = "Describe a tweak…";

  if (scope) {
    placeholder2 = `Describe a tweak to ${scope}…`;
  }

  return (
    <form
      ref={root}
      className="tweak-prompt ui-popover"
      onSubmit={(eventValue) => {
        eventValue.preventDefault();
        send();
      }}
    >
      <input
        autoFocus
        aria-label={copy.describeATweak}
        placeholder={placeholder2}
        value={text}
        onChange={(event3) => setText(event3.target.value)}
        onKeyDown={(event4) => {
          if (event4.key !== "Escape") {
            return;
          }

          event4.preventDefault();
          event4.stopPropagation();
          onClose();
        }}
      />
      <button
        type="submit"
        className="icon-btn small send"
        aria-label={copy.sendTweak}
        disabled={!text.trim()}
      >
        <Icon name="arrowUp" size={14} />
      </button>
    </form>
  );
};

const gapStyle = (
  spacingBadge: SpacingBadge
):
  | { left: number; top: number; width: number; height?: undefined }
  | { height: number; left: number; top: number; width?: undefined } => {
  if (spacingBadge.axis === "x") {
    return {
      left: spacingBadge.from,
      top: spacingBadge.at,
      width: spacingBadge.to - spacingBadge.from,
    };
  }

  return {
    height: spacingBadge.to - spacingBadge.from,
    left: spacingBadge.at,
    top: spacingBadge.from,
  };
};

const FrameSnapLayer = ({
  origin,
}: {
  origin: { x: number; y: number };
}): ReactElement | null => {
  const view = useSyncExternalStore(
    frameSnapStore.subscribe,
    frameSnapStore.get
  );

  if (view.guides.length === 0 && view.spacing.length === 0) {
    return null;
  }

  const style = {
    left: -origin.x,
    top: -origin.y,
    translate: `${view.shift.x}px ${view.shift.y}px`,
  };

  return (
    <div
      className="snap-guides frame-snap"
      data-testid="frame-snap"
      style={style}
    >
      {view.guides.map((snapGuide) => (
        <div
          key={`g-${snapGuide.axis}-${snapGuide.at}`}
          className={`snap-guide ${snapGuide.axis}`}
          style={guideStyle(snapGuide)}
        />
      ))}
      {view.spacing.map((spacingBadgeValue) => (
        <div
          key={`s-${spacingBadgeValue.axis}-${spacingBadgeValue.from}-${spacingBadgeValue.to}`}
          className={`snap-gap ${spacingBadgeValue.axis}`}
          style={gapStyle(spacingBadgeValue)}
        >
          <span className="snap-gap-label" data-value={spacingBadgeValue.value}>
            {formatMeasure(spacingBadgeValue.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const MarqueeLayer = ({
  listen,
}: {
  listen: (handler: (message: BridgeToParent) => void) => () => void;
}): ReactElement | null => {
  const [rect, setRect] = useState<SelectionContext["rect"] | null>(null);
  useEffect(
    () =>
      listen((message) => {
        if (message.type === "marquee") {
          setRect(message.rect);
        } else if (message.type === "ready" || message.type === "mode-exited") {
          setRect(null);
        }
      }),
    [listen]
  );
  const shown = rect !== null;
  useEffect(() => {
    if (!shown) {
      return;
    }

    const clear = (): void => setRect(null);
    globalThis.addEventListener("pointerup", clear);

    return (): void => globalThis.removeEventListener("pointerup", clear);
  }, [shown]);

  if (!rect) {
    return null;
  }

  return (
    <div className="overlay" aria-hidden="true">
      <div
        className="box marquee"
        data-testid="marquee"
        style={{
          height: rect.height,
          left: rect.x,
          top: rect.y,
          width: rect.width,
        }}
      />
    </div>
  );
};

export { FrameSnapLayer, MarqueeLayer, PresentLayer, TweakPrompt, gapStyle };
