import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import type { PrototypeLink } from "./deps.js";
import { keyMatches, linksFrom, phaseOf, runLink } from "./play-runtime.js";
import type { PlayHandlers } from "./play-runtime.js";

interface PlayTriggerHost {
  readonly frameId: string | null;
  readonly handlers: PlayHandlers;
  readonly links: readonly PrototypeLink[];
  readonly token: string | null;
}

interface PlayTriggers {
  readonly onKey: (key: string) => void;
  readonly onTrigger: (id: string, phase: string) => void;
}

const TYPING_TAGS = new Set(["input", "select", "textarea"]);

const isTyping = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable || TYPING_TAGS.has(target.tagName.toLowerCase())
  );
};

const delayOfLink = (link: PrototypeLink): number => {
  if (link.trigger?.kind === "delay") {
    return link.trigger.ms;
  }

  return 0;
};

const delayKeyOf = (
  links: readonly PrototypeLink[],
  frameId: string | null
): string => {
  if (frameId === null) {
    return "";
  }

  return linksFrom(links, frameId, "delay")
    .map((link) => `${link.id}:${delayOfLink(link)}`)
    .join("|");
};

const useDelayTimers = (
  ref: { readonly current: PlayTriggerHost },
  host: PlayTriggerHost
): void => {
  const { frameId, token } = host;
  const delayKey = delayKeyOf(host.links, frameId);

  useEffect(() => {
    if (token === null || frameId === null || delayKey === "") {
      return;
    }

    const timers = linksFrom(ref.current.links, frameId, "delay").map((link) =>
      globalThis.setTimeout(() => {
        runLink(link, "start", ref.current.handlers);
      }, delayOfLink(link))
    );

    return (): void => {
      for (const timer of timers) {
        globalThis.clearTimeout(timer);
      }
    };
  }, [delayKey, frameId, ref, token]);
};

const useKeyListener = (onKey: (key: string) => void): void => {
  useEffect(() => {
    const listener = (event: KeyboardEvent): void => {
      const isChord = event.metaKey || event.ctrlKey || event.altKey;

      if (!isChord && !isTyping(event.target)) {
        onKey(event.key);
      }
    };

    globalThis.addEventListener("keydown", listener);

    return (): void => {
      globalThis.removeEventListener("keydown", listener);
    };
  }, [onKey]);
};

const usePlayTriggers = (host: PlayTriggerHost): PlayTriggers => {
  const ref = useRef(host);

  useLayoutEffect(() => {
    ref.current = host;
  });

  useDelayTimers(ref, host);

  const onKey = useCallback((key: string): void => {
    const { frameId, handlers, links } = ref.current;

    if (frameId === null) {
      return;
    }

    for (const link of linksFrom(links, frameId, "key")) {
      if (keyMatches(link, key)) {
        runLink(link, "start", handlers);
      }
    }
  }, []);

  const onTrigger = useCallback((id: string, phase: string): void => {
    const { handlers, links } = ref.current;
    const link = links.find((item) => item.id === id);

    if (link) {
      runLink(link, phaseOf(phase), handlers);
    }
  }, []);

  useKeyListener(onKey);

  return { onKey, onTrigger };
};

export { usePlayTriggers };

export type { PlayTriggerHost, PlayTriggers };
