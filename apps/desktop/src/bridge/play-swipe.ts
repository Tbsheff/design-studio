import { isSwipeKind } from "@design-studio/contracts/link-interaction";
import type { LinkQuery } from "@design-studio/contracts/links";

interface SwipeStart {
  readonly ids: ReadonlySet<string>;
  readonly pointerId: number;
  readonly time: number;
  readonly x: number;
  readonly y: number;
}

interface SwipeTracker {
  readonly begin: (event: PointerEvent) => void;
  readonly end: (event: PointerEvent) => void;
  readonly move: (event: PointerEvent) => void;
  readonly swallow: (event: MouseEvent) => void;
}

interface SwipeHost {
  readonly getQueries: () => readonly LinkQuery[];
  readonly owns: (query: LinkQuery, target: EventTarget | null) => boolean;
  readonly post: (id: string) => void;
}

const SWIPE_MIN_PX = 40;
const SWIPE_MAX_MS = 600;
const SWIPE_PREFIX = "swipe-";

const toSwipeDirection = (dx: number, dy: number): string | null => {
  const horizontal = Math.abs(dx) >= Math.abs(dy);

  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) {
    return null;
  }

  if (horizontal && dx < 0) {
    return `${SWIPE_PREFIX}left`;
  }

  if (horizontal) {
    return `${SWIPE_PREFIX}right`;
  }

  if (dy < 0) {
    return `${SWIPE_PREFIX}up`;
  }

  return `${SWIPE_PREFIX}down`;
};

const isSwipeQuery = (query: LinkQuery): boolean =>
  isSwipeKind(query.trigger ?? "");

const createSwipeTracker = (host: SwipeHost): SwipeTracker => {
  let start: SwipeStart | null = null;
  let isSpent = false;

  const settle = (event: PointerEvent): readonly string[] => {
    if (!start || start.pointerId !== event.pointerId) {
      return [];
    }

    const origin = start;

    if (event.timeStamp - origin.time > SWIPE_MAX_MS) {
      start = null;

      return [];
    }

    const direction = toSwipeDirection(
      event.clientX - origin.x,
      event.clientY - origin.y
    );

    if (direction === null) {
      return [];
    }

    start = null;
    isSpent = true;

    const ids: string[] = [];

    for (const query of host.getQueries()) {
      if (origin.ids.has(query.id) && query.trigger === direction) {
        ids.push(query.id);
      }
    }

    return ids;
  };

  const move = (event: PointerEvent): void => {
    for (const id of settle(event)) {
      host.post(id);
    }
  };

  const begin = (event: PointerEvent): void => {
    const owned = host
      .getQueries()
      .filter((query) => isSwipeQuery(query) && host.owns(query, event.target));

    isSpent = false;
    start = null;

    if (owned.length > 0) {
      start = {
        ids: new Set(owned.map((query) => query.id)),
        pointerId: event.pointerId,
        time: event.timeStamp,
        x: event.clientX,
        y: event.clientY,
      };
    }
  };

  const end = (event: PointerEvent): void => {
    move(event);
    start = null;
  };

  const swallow = (event: MouseEvent): void => {
    if (isSpent) {
      isSpent = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  return { begin, end, move, swallow };
};

export { createSwipeTracker, isSwipeQuery };

export type { SwipeTracker };
