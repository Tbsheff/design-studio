import { useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

import { matchesKey } from "../../../shared/keymap.js";
import { IS_MAC, tipWithKey } from "../commands/keys.js";
import { useCommands } from "../commands/registry.js";
import { copy } from "./copy.js";
import { MiniRail } from "./mini-rail.js";
import { OpenRail } from "./open-rail.js";
import {
  noteProjectOpened,
  refreshProjectHits,
  useProjectHits,
} from "./project-hits-model.js";
import {
  getRailState,
  isFloating,
  setRail,
  setRailToggled,
  useRail,
} from "./rail-store-model.js";
import type { RailState } from "./rail-store-model.js";

import "../../styles/project-nav.css";

function useFloatingDismiss(
  state: RailState,
  rail: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    if (state !== "open") {
      return;
    }

    const close = (): void => {
      if (isFloating()) {
        setRail("mini");
      }
    };

    const onPointer = (event: PointerEvent): void => {
      if (!rail.current?.contains(event.target as Node)) {
        close();
      }
    };

    const onKey = (event: KeyboardEvent): void => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !document.querySelector('[role="dialog"][aria-modal="true"]')
      ) {
        close();
      }
    };

    globalThis.addEventListener("pointerdown", onPointer, true);
    globalThis.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);

    return (): void => {
      globalThis.removeEventListener("pointerdown", onPointer, true);
      globalThis.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", close);
    };
  }, [state, rail]);
}

function moveFocus(event: ReactKeyboardEvent<HTMLElement>): void {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
    return;
  }

  const items = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(".prail-item"),
  ];

  const at = items.indexOf(document.activeElement as HTMLElement);

  if (at === -1 && !(document.activeElement instanceof HTMLInputElement)) {
    return;
  }

  event.preventDefault();

  const next =
    at === -1
      ? 0
      : (at + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
        items.length;

  items[next]?.focus();
}

function useStageFocusOnClose(
  state: RailState,
  rail: RefObject<HTMLElement | null>
): void {
  const last = useRef(state);
  useEffect(() => {
    const closed = last.current === "open" && state !== "open";
    last.current = state;

    if (!closed) {
      return;
    }

    const active = document.activeElement;

    if (active && active !== document.body && !rail.current?.contains(active)) {
      return;
    }

    document
      .querySelector<HTMLElement>(".canvas .stage")
      ?.focus({ preventScroll: true });
  }, [state, rail]);
}

function useRailKeys(onOpened: () => void): void {
  const opened = useRef(onOpened);
  opened.current = onOpened;
  useCommands(() => [
    {
      group: "View",
      icon: "sidebar",
      id: "view.project-rail",
      keyId: "project-rail",
      keywords: "projects switch sidebar recent",
      run: () => setRailToggled(),
      title: "Show or hide the project rail",
    },
  ]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        !matchesKey("project-rail", event, IS_MAC)
      ) {
        return;
      }

      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        return;
      }

      event.preventDefault();
      setRailToggled();

      if (getRailState() === "open") {
        globalThis.requestAnimationFrame(() => opened.current());
      }
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, []);
}

interface RailProps {
  readonly projectId: string;
  readonly onHome: () => void;
  readonly onNewPrototype: () => void;
}

const ProjectRail = ({ projectId, onHome, onNewPrototype }: RailProps) => {
  const state = useRail();
  const result = useProjectHits(projectId, false);
  const find = useRef<HTMLInputElement>(null);
  const aside = useRef<HTMLElement>(null);
  useRailKeys(() => find.current?.focus());
  useFloatingDismiss(state, aside);
  useStageFocusOnClose(state, aside);
  useEffect(() => {
    if (
      state === "open" &&
      document.activeElement instanceof HTMLIFrameElement
    ) {
      find.current?.focus();
    }
  }, [state]);
  useEffect(() => noteProjectOpened(projectId), [projectId]);
  useEffect((): (() => void) => {
    const onFocus = () => refreshProjectHits(projectId);
    window.addEventListener("focus", onFocus);

    return () => window.removeEventListener("focus", onFocus);
  }, [projectId]);
  const hits = result?.projects ?? [];

  return (
    <aside
      ref={aside}
      className="prail"
      data-state={state}
      aria-label={copy.projectRail}
      onKeyDown={moveFocus}
    >
      {state === "open" ? (
        <OpenRail
          hits={hits}
          collapseTip={tipWithKey(copy.collapseTip, "project-rail")}
          projectId={projectId}
          onHome={onHome}
          onNewPrototype={onNewPrototype}
          find={find}
        />
      ) : (
        <MiniRail
          hits={hits}
          showTip={tipWithKey(copy.showProjectsTip, "project-rail")}
          projectId={projectId}
          onNewPrototype={onNewPrototype}
        />
      )}
    </aside>
  );
};

export { ProjectRail };

export {
  setRail,
  setRailToggled as toggleRail,
  useRail,
} from "./rail-store-model.js";
