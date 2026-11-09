import type { BridgeToParent, ProjectKind } from "@design-studio/contracts";
import { staticLinkIssue } from "@design-studio/contracts/links";
import type {
  LinkIssue,
  LinkQuery,
  LinkRectReport,
  LinksFile,
  PrototypeLink,
} from "@design-studio/contracts/links";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

interface LinkReport {
  readonly token: string;
  readonly rects: RectMap;
}

interface PostedLinks {
  readonly element: HTMLIFrameElement | null;
  readonly token: string;
  readonly text: string;
}

type RectMap = Map<string, Rect | null>;

type SlotsRef = MutableRefObject<FrameSlot[]>;

const linkQuery = (link: PrototypeLink): LinkQuery => {
  const query: LinkQuery = { id: link.id, selector: link.from.selector };

  if (link.from.tag) {
    query.tag = link.from.tag;
  }

  if (link.from.text) {
    query.text = link.from.text;
  }

  if (link.when) {
    query.when = link.when;
  }

  return query;
};

const toActiveSlot = (options: Options): FrameSlot | null => {
  const { frameId, token, src, elements } = options.active;

  if (!token || !src) {
    return null;
  }

  const element = elements.current[token] ?? null;

  return { element, frameId, src, token };
};

const toPassiveSlots = (options: Options): FrameSlot[] => {
  const list: FrameSlot[] = [];

  for (const slot of options.passive.slots) {
    if (slot.src && slot.id !== options.active.frameId) {
      const { src, token } = slot;
      const frameId = slot.id;
      const element = options.passive.elements.current[token] ?? null;
      list.push({ element, frameId, src, token });
    }
  }

  return list;
};

const slotsOf = (options: Options): FrameSlot[] => {
  const active = toActiveSlot(options);

  if (active) {
    return [active, ...toPassiveSlots(options)];
  }

  return toPassiveSlots(options);
};

const bridgeFrame = (slot: FrameSlot, kind: ProjectKind): BridgeFrame => {
  const { element, frameId: key, src: url, token } = slot;

  return { element, key, kind, token, url };
};

const toQueries = (options: Options, frameId: string): LinkQuery[] => {
  const queries: LinkQuery[] = [];

  if (!options.enabled) {
    return queries;
  }

  for (const link of options.file.links) {
    if (
      link.from.frame === frameId &&
      staticLinkIssue(link, options.frames) === null
    ) {
      queries.push(linkQuery(link));
    }
  }

  return queries;
};

const toRects = (links: LinkRectReport[]): RectMap => {
  const rects: RectMap = new Map();

  if (!Array.isArray(links)) {
    return rects;
  }

  for (const report of links) {
    if (report?.id) {
      rects.set(report.id, report.rect ?? null);
    }
  }

  return rects;
};

const isPosted = (
  last: PostedLinks | undefined,
  slot: FrameSlot,
  text: string
): boolean =>
  Boolean(last) &&
  last?.element === slot.element &&
  last.token === slot.token &&
  last.text === text;

const useLinkPoster = (
  options: Options,
  slotsRef: SlotsRef
): ((slot: FrameSlot, force: boolean) => void) => {
  const queriesRef = useRef(options);
  useLayoutEffect(() => {
    queriesRef.current = options;
  });
  const posted = useRef(new Map<string, PostedLinks>());

  const send = (slot: FrameSlot, force: boolean): void => {
    const queries = toQueries(queriesRef.current, slot.frameId);
    const text = JSON.stringify(queries);

    if (!force && isPosted(posted.current.get(slot.frameId), slot, text)) {
      return;
    }

    const { element, token } = slot;
    posted.current.set(slot.frameId, { element, text, token });
    postToFrame(bridgeFrame(slot, options.kind), {
      links: queries,
      type: "track-links",
    });
  };

  useEffect(() => {
    for (const slot of slotsRef.current) {
      send(slot, false);
    }
  });

  return send;
};

const useLinkReports = (
  kind: ProjectKind,
  slotsRef: SlotsRef,
  send: (slot: FrameSlot, force: boolean) => void
): Record<string, LinkReport> => {
  const [reports, setReports] = useState<Record<string, LinkReport>>({});

  useBridge(
    () => slotsRef.current.map((slot) => bridgeFrame(slot, kind)),
    (frame, message: BridgeToParent) => {
      const slot = slotsRef.current.find((item) => item.frameId === frame.key);

      if (!slot) {
        return;
      }

      if (message.type === "ready") {
        send(slot, true);
      }

      if (message.type === "link-rects") {
        const rects = toRects(message.links);
        setReports((prev) => ({
          ...prev,
          [frame.key]: { rects, token: frame.token },
        }));
      }
    }
  );

  return reports;
};

const toState = (
  link: PrototypeLink,
  issue: LinkIssue | null,
  rect: Rect | null
): LinkState => ({ issue, link, rect });

const isReportCurrent = (
  report: LinkReport | undefined,
  slot: FrameSlot | undefined,
  linkId: string
): report is LinkReport => {
  if (!report || !slot) {
    return false;
  }

  return report.token === slot.token && report.rects.has(linkId);
};

const toLinkState = (
  link: PrototypeLink,
  options: Options,
  reports: Record<string, LinkReport>,
  slots: FrameSlot[]
): LinkState => {
  const issue = staticLinkIssue(link, options.frames);

  if (issue) {
    return toState(link, issue, null);
  }

  const report = reports[link.from.frame];
  const slot = slots.find((item) => item.frameId === link.from.frame);

  if (!isReportCurrent(report, slot, link.id)) {
    return toState(link, null, null);
  }

  const rect = report.rects.get(link.id) ?? null;

  if (rect) {
    return toState(link, null, rect);
  }

  return toState(link, "element-missing", null);
};

const useLinkRects = (options: Options): LinkState[] => {
  const slots = slotsOf(options);
  const slotsRef = useRef(slots);
  useLayoutEffect(() => {
    slotsRef.current = slots;
  });
  const send = useLinkPoster(options, slotsRef);
  const reports = useLinkReports(options.kind, slotsRef, send);

  return options.file.links.map((link) =>
    toLinkState(link, options, reports, slots)
  );
};

export { linkQuery, useLinkRects };

export type { LinkState };
