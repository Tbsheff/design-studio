import { useEffect, useRef } from "react";
import type { ReactElement, RefObject } from "react";

import { tipWithKey } from "../../platform/key-tip.js";
import { IS_MAC } from "../commands/keys.js";
import { useCommands } from "../commands/registry.js";
import type { Command } from "../commands/registry.js";
import { copy } from "./copy.js";
import type { ProjectHit } from "./deps.js";
import { MiniRail } from "./mini-rail.js";
import { OpenRail } from "./open-rail.js";
import {
  noteProjectOpened,
  refreshProjectHits,
  useProjectHits,
} from "./project-hits-model.js";
import { setRailToggled, useRail } from "./rail-store-model.js";
import type { RailState } from "./rail-store-model.js";
import { useFloatingDismiss } from "./use-floating-dismiss.js";
import { useRailArrowKeys } from "./use-rail-arrow-keys.js";
import { useRailKeys } from "./use-rail-keys.js";
import { useStageFocusOnClose } from "./use-stage-focus-on-close.js";

interface RailProps {
  readonly projectId: string;
  readonly onHome: () => void;
  readonly onNewPrototype: () => void;
}

const RAIL_KEY = "project-rail";

const EMPTY_HITS: ProjectHit[] = [];

const toRailCommands = (): Command[] => [
  {
    group: "View",
    icon: "sidebar",
    id: "view.project-rail",
    keyId: RAIL_KEY,
    keywords: "projects switch sidebar recent",
    run: () => setRailToggled(),
    title: "Show or hide the project rail",
  },
];

const toRailBody = (
  state: RailState,
  props: RailProps,
  hits: ProjectHit[],
  find: RefObject<HTMLInputElement | null>
): ReactElement => {
  if (state === "open") {
    return (
      <OpenRail
        hits={hits}
        collapseTip={tipWithKey(copy.collapseTip, RAIL_KEY)}
        projectId={props.projectId}
        onHome={props.onHome}
        onNewPrototype={props.onNewPrototype}
        find={find}
      />
    );
  }

  return (
    <MiniRail
      hits={hits}
      showTip={tipWithKey(copy.showProjectsTip, RAIL_KEY)}
      projectId={props.projectId}
      onNewPrototype={props.onNewPrototype}
    />
  );
};

const ProjectRail = (props: RailProps): ReactElement => {
  const { projectId } = props;
  const state = useRail();
  const result = useProjectHits(projectId, false);
  const find = useRef<HTMLInputElement>(null);
  const aside = useRef<HTMLElement>(null);
  useCommands(toRailCommands);
  useRailKeys(find, IS_MAC);
  useRailArrowKeys(aside);
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
  useEffect(() => {
    const onFocus = (): void => {
      refreshProjectHits(projectId, false);
    };

    window.addEventListener("focus", onFocus);

    return (): void => window.removeEventListener("focus", onFocus);
  }, [projectId]);

  return (
    <aside
      ref={aside}
      className="prail"
      data-state={state}
      aria-label={copy.projectRail}
    >
      {toRailBody(state, props, result?.projects ?? EMPTY_HITS, find)}
    </aside>
  );
};

export { ProjectRail };
