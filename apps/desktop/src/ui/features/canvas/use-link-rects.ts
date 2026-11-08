import type { BridgeToParent, ProjectKind } from "@design-studio/contracts";
import { staticLinkIssue } from "@design-studio/contracts/links";
import type {
  LinkIssue,
  LinkQuery,
  LinkRectReport,
  LinksFile,
  PrototypeLink,
} from "@design-studio/contracts/links";
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { postToFrame, useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import type { CanvasFrame } from "./canvas-frames-model.js";

type Rect = NonNullable<LinkRectReport["rect"]>;

interface LinkState {
  link: PrototypeLink;
  rect: Rect | null;
  issue: LinkIssue | null;
}

interface FrameSlot {
  frameId: string;
  token: string;
  src: string;
  element: HTMLIFrameElement | null;
}

interface Options {
  kind: ProjectKind;
  file: LinksFile;
  frames: CanvasFrame[];
  enabled: boolean;
  active: {
    frameId: string;
    token: string | null;
    src: string | null;
    elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  };
  passive: {
    slots: { id: string; token: string; src: string | null }[];
    elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  };
}

const linkQuery = (link: PrototypeLink): LinkQuery => ({
  id: link.id,
  selector: link.from.selector,
  ...(link.from.tag ? { tag: link.from.tag } : {}),
  ...(link.from.text ? { text: link.from.text } : {}),
});

const slotsOf = (options: Options): FrameSlot[] => {
  const list: FrameSlot[] = [];

  if (options.active.token && options.active.src) {
    list.push({
      element: options.active.elements.current[options.active.token] ?? null,
      frameId: options.active.frameId,
      src: options.active.src,
      token: options.active.token,
    });
  }

  for (const slot of options.passive.slots) {
    if (!slot.src || slot.id === options.active.frameId) {
      continue;
    }

    list.push({
      element: options.passive.elements.current[slot.token] ?? null,
      frameId: slot.id,
      src: slot.src,
      token: slot.token,
    });
  }

  return list;
};

const bridgeFrame = (slot: FrameSlot, kind: ProjectKind): BridgeFrame => ({
  element: slot.element,
  key: slot.frameId,
  kind,
  token: slot.token,
  url: slot.src,
});

const useLinkRects = (optionsValue: Options): LinkState[] => {
  const [reports, setReports] = useState<
    Record<string, { token: string; rects: Record<string, Rect | null> }>
  >({});

  const queriesOf = (frameId: string): LinkQuery[] =>
    optionsValue.enabled
      ? optionsValue.file.links
          .filter(
            (link) =>
              link.from.frame === frameId &&
              staticLinkIssue(link, optionsValue.frames) === null
          )
          .map(linkQuery)
      : [];

  const slots = slotsOf(optionsValue);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const queriesRef = useRef(queriesOf);
  queriesRef.current = queriesOf;

  const posted = useRef(
    new Map<
      string,
      { element: HTMLIFrameElement | null; token: string; text: string }
    >()
  );

  const send = (slot: FrameSlot, force: boolean): void => {
    const queries = queriesRef.current(slot.frameId);
    const text = JSON.stringify(queries);
    const last = posted.current.get(slot.frameId);

    if (
      !force &&
      last &&
      last.element === slot.element &&
      last.token === slot.token &&
      last.text === text
    ) {
      return;
    }

    posted.current.set(slot.frameId, {
      element: slot.element,
      text,
      token: slot.token,
    });
    postToFrame(bridgeFrame(slot, optionsValue.kind), {
      links: queries,
      type: "track-links",
    });
  };

  useEffect(() => {
    for (const slot of slotsRef.current) {
      send(slot, false);
    }
  });

  useBridge(
    () => slotsRef.current.map((slot) => bridgeFrame(slot, optionsValue.kind)),
    (frame, message: BridgeToParent) => {
      const slot = slotsRef.current.find((item) => item.frameId === frame.key);

      if (!slot) {
        return;
      }

      if (message.type === "ready") {
        send(slot, true);
      }

      if (message.type !== "link-rects") {
        return;
      }

      const rects: Record<string, Rect | null> = {};

      for (const report of Array.isArray(message.links) ? message.links : []) {
        if (typeof report?.id === "string") {
          rects[report.id] = report.rect ?? null;
        }
      }

      setReports((prev) => ({
        ...prev,
        [frame.key]: { rects, token: frame.token },
      }));
    }
  );

  return optionsValue.file.links.map((link) => {
    const issue = staticLinkIssue(link, optionsValue.frames);

    if (issue) {
      return { issue, link, rect: null };
    }

    const report = reports[link.from.frame];
    const slot = slots.find((item) => item.frameId === link.from.frame);

    if (
      !report ||
      !slot ||
      report.token !== slot.token ||
      !(link.id in report.rects)
    ) {
      return { issue: null, link, rect: null };
    }

    const rect = report.rects[link.id] ?? null;

    return { issue: rect ? null : "element-missing", link, rect };
  });
};

export { linkQuery, useLinkRects };

export type { LinkState };
