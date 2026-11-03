import { resolveAnchor } from "../shared/comments.js";
import type { AnchorDom } from "../shared/comments.js";
import { SOURCE_LOC_ATTR } from "../shared/contracts.js";
import type { AnchorQuery, AnchorReport } from "../shared/contracts.js";
import type { OutgoingBody } from "./bridge-types.js";
import { isObject, isString } from "./dom-input.js";
import { queryElement, rectOf, selectorFor } from "./element-info.js";
import { resizeObserverFor, sameElements } from "./rect-tracker.js";

const MAX_ANCHORS = 200;
const TAG_NAME = /^[a-z][a-z0-9-]*$/iu;

const anchorDom: AnchorDom<Element> = {
  bySelector: (selector) => queryElement(selector),
  bySource: (loc) =>
    [...document.querySelectorAll(`[${SOURCE_LOC_ATTR}]`)].filter(
      (element) => element.getAttribute(SOURCE_LOC_ATTR) === loc
    ),
  byTag: (tag) => {
    if (!TAG_NAME.test(tag)) {
      return [];
    }

    return [...document.getElementsByTagName(tag)];
  },
  tagOf: (element) => element.tagName.toLowerCase(),
  textOf: (element) => {
    if (element instanceof HTMLElement) {
      return element.innerText;
    }

    return element.textContent ?? "";
  },
};

const isAnchorQuery = (value: unknown): value is AnchorQuery => {
  if (!isObject(value)) {
    return false;
  }

  const query = value as Partial<AnchorQuery>;

  return (
    isString(query.id) &&
    isString(query.selector) &&
    isString(query.tag) &&
    isString(query.textSnippet) &&
    (query.sourceLoc === null || isString(query.sourceLoc))
  );
};

const anchorQueries = (raw: unknown): AnchorQuery[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isAnchorQuery).slice(0, MAX_ANCHORS);
};

const resolveAnchorElement = (
  query: AnchorQuery
): { element: Element; report: AnchorReport } | null => {
  const found = resolveAnchor(query, anchorDom);

  if (!found) {
    return null;
  }

  const report: AnchorReport = {
    id: query.id,
    rect: rectOf(found.element),
    selector: selectorFor(found.element),
    sourceLoc: found.element.getAttribute(SOURCE_LOC_ATTR),
    via: found.via,
  };

  return { element: found.element, report };
};

interface AnchorTracker {
  readonly track: (queries: AnchorQuery[]) => void;
  readonly schedule: () => void;
}

const createAnchorTracker = (
  post: (body: OutgoingBody) => void
): AnchorTracker => {
  let queries: AnchorQuery[] = [];
  let observed: (Element | null)[] = [];
  let frame = 0;
  const observer = resizeObserverFor(() => schedule());

  const observe = (elements: (Element | null)[]): void => {
    if (!observer || sameElements(elements, observed)) {
      return;
    }

    observed = elements;
    observer.disconnect();

    if (elements.length === 0) {
      return;
    }

    observer.observe(document.documentElement);

    for (const element of elements) {
      if (element) {
        observer.observe(element);
      }
    }
  };

  const send = (): void => {
    frame = 0;
    const resolved = queries.map(resolveAnchorElement);
    observe(resolved.map((entry) => entry?.element ?? null));
    post({
      anchors: resolved.map(
        (entry, index) =>
          entry?.report ?? {
            id: queries[index]?.id ?? "",
            rect: null,
            via: null,
          }
      ),
      type: "anchor-rects",
    });
  };

  const schedule = (): void => {
    if (queries.length === 0 || frame) {
      return;
    }

    frame = window.requestAnimationFrame(send);
  };

  const track = (next: AnchorQuery[]): void => {
    queries = next;

    if (frame) {
      window.cancelAnimationFrame(frame);
    }

    frame = 0;

    if (next.length === 0) {
      observe([]);
      post({ anchors: [], type: "anchor-rects" });

      return;
    }

    send();
  };

  return { schedule, track };
};

export { anchorQueries, createAnchorTracker, resolveAnchorElement };
