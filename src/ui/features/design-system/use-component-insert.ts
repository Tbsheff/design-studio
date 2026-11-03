import { useCallback, useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";

import type {
  BridgeToParent,
  ProjectKind,
  SelectionContext,
} from "../../../shared/contracts.js";
import type {
  InsertPosition,
  InsertableComponent,
  InsertTarget,
} from "../../../shared/insert.js";
import { useBridge } from "../../platform/bridge.js";
import type { BridgeFrame, ParentMessageBody } from "../../platform/bridge.js";
import { NO_SOURCE } from "../inspector/structure-edits.js";
import { insertApi, insertBus, insertError } from "./component-insert-api.js";
import type { DropHint, InsertHost } from "./component-insert-api.js";

const FRAME_CHANGES = new Set(["painted", "ready", "tree"]);

const RESELECT_FOR_MS = 6000;

interface Frames {
  slots: { token: string; src: string }[];
  frontToken: string | null;
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  post: (body: ParentMessageBody) => void;
}

interface Options {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  enabled: boolean;
  frames: Frames;
  selection: SelectionContext[];
  notify: (message: string) => void;
}

const newSelector = (selector: string, position: InsertPosition): string =>
  position === "inside" ? `${selector} > :last-child` : `${selector} + *`;

interface DropAt {
  requestId: string;
  selection: SelectionContext | null;
  inside: boolean;
  label: string;
}

const targetOf = (selection: SelectionContext): InsertTarget | null => {
  if (!selection.source && !selection.owners?.length) {
    return null;
  }

  if (selection.usedAt && selection.usedBy?.root) {
    return {
      selector: selection.selector,
      source: selection.usedAt,
      tag: selection.usedBy.name.toLowerCase(),
    };
  }

  return {
    selector: selection.selector,
    source: selection.source,
    tag: selection.tag.toLowerCase(),
    ...(selection.owners?.length ? { owners: selection.owners } : {}),
  };
};

const frameRect = (
  frames: Frames
): { el: HTMLIFrameElement; rect: DOMRect } | null => {
  const el = frames.frontToken
    ? frames.elements.current[frames.frontToken]
    : null;

  return el ? { el, rect: el.getBoundingClientRect() } : null;
};

const localPoint = (
  frames: Frames,
  x: number,
  y: number
): { x: number; y: number } | null => {
  const found = frameRect(frames);

  if (!found) {
    return null;
  }

  const { el, rect } = found;

  if (
    x < rect.left ||
    x > rect.right ||
    y < rect.top ||
    y > rect.bottom ||
    rect.width === 0
  ) {
    return null;
  }

  const scale = rect.width / (el.offsetWidth || rect.width);

  return { x: (x - rect.left) / scale, y: (y - rect.top) / scale };
};

const hintOf = (drop: DropAt | null): DropHint | null => {
  if (!drop?.selection) {
    return null;
  }

  if (!drop.selection.source && !drop.selection.owners?.length) {
    return { ok: false, text: "This element has no source location" };
  }

  return {
    ok: true,
    text: drop.inside
      ? `Insert into ${drop.label}`
      : `Insert after ${drop.label}`,
  };
};

export const useComponentInsert = (o: Options): void => {
  const live = useRef(o);
  live.current = o;
  const busy = useRef(false);
  const drop = useRef<DropAt | null>(null);

  const pending = useRef<{
    id: string;
    onHint: (hint: DropHint | null) => void;
  } | null>(null);

  const reselect = useRef<{
    selector: string;
    name: string;
    target: string;
    until: number;
  } | null>(null);

  const seq = useRef(0);

  const stopReselect = useCallback(() => {
    reselect.current = null;
  }, []);

  const tickReselect = useCallback(() => {
    const job = reselect.current;

    if (!job) {
      return;
    }

    const last = live.current.selection.at(-1);

    const landed =
      last &&
      last.selector !== job.target &&
      last.owners?.[0]?.name === job.name;

    if (landed || Date.now() > job.until) {
      return stopReselect();
    }

    live.current.frames.post({
      selector: job.selector,
      type: "select-selector",
    });
  }, [stopReselect]);

  const startReselect = useCallback(
    (selector: string, name: string, target: string) => {
      reselect.current = {
        name,
        selector,
        target,
        until: Date.now() + RESELECT_FOR_MS,
      };
      tickReselect();
    },
    [tickReselect]
  );

  useEffect(tickReselect, [o.selection, tickReselect]);

  useEffect(() => stopReselect, [stopReselect]);

  const run = useCallback(
    async (
      component: InsertableComponent,
      position: InsertPosition,
      selection: SelectionContext | undefined
    ) => {
      const cur = live.current;

      if (!cur.enabled || !cur.directionId) {
        return cur.notify(
          "Edits are paused here. Wait for the run to finish, or open the latest version."
        );
      }

      if (!selection) {
        return cur.notify(
          "Select an element first, then insert the component inside or after it."
        );
      }

      const target = targetOf(selection);

      if (!target) {
        return cur.notify(NO_SOURCE);
      }

      if (busy.current) {
        return;
      }

      busy.current = true;

      try {
        await insertApi.insert(cur.projectId, cur.directionId, {
          component: { file: component.file, name: component.name },
          position,
          target,
        });
        startReselect(
          newSelector(selection.selector, position),
          component.name,
          selection.selector
        );
      } catch (error) {
        live.current.notify(insertError(error));
      } finally {
        busy.current = false;
      }
    },
    [startReselect]
  );

  useBridge(
    () =>
      live.current.frames.slots.map((slot): BridgeFrame => ({
        element: live.current.frames.elements.current[slot.token] ?? null,
        key: slot.token,
        kind: live.current.kind,
        token: slot.token,
        url: slot.src,
      })),
    (frame, msg: BridgeToParent) => {
      const isFront = frame.token === live.current.frames.frontToken;

      if (isFront && FRAME_CHANGES.has(msg.type)) {
        tickReselect();

        return;
      }

      if (
        msg.type !== "element-at" ||
        frame.token !== live.current.frames.frontToken
      ) {
        return;
      }

      const wait = pending.current;

      if (!wait || wait.id !== msg.requestId) {
        return;
      }

      drop.current = {
        inside: msg.inside,
        label: msg.label,
        requestId: msg.requestId,
        selection: msg.selection,
      };
      wait.onHint(hintOf(drop.current));
    }
  );

  const host = useMemo<InsertHost>(
    () => ({
      dragEnd(component, x, y) {
        const last = drop.current;
        drop.current = null;
        pending.current = null;

        if (!localPoint(live.current.frames, x, y)) {
          return;
        }

        if (!last?.selection) {
          return live.current.notify(
            "Drop the component on an element in the frame."
          );
        }

        void run(component, last.inside ? "inside" : "after", last.selection);
      },
      dragMove(x, y, onHint) {
        const point = localPoint(live.current.frames, x, y);

        if (!point) {
          drop.current = null;
          onHint(null);

          return;
        }

        seq.current += 1;
        const id = `drop-${seq.current}`;
        pending.current = { id, onHint };
        live.current.frames.post({
          requestId: id,
          type: "element-at",
          x: point.x,
          y: point.y,
        });
      },
      insert: (component, position) =>
        void run(component, position, live.current.selection.at(-1)),
    }),
    [run]
  );

  useEffect(() => {
    insertBus.set(host);

    return () => insertBus.clear(host);
  }, [host]);
};
