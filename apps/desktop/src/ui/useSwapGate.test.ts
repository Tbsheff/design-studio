import { describe, expect, it } from "vitest";

import { SwapQueue } from "./features/inspector/use-swap-gate";

const CHANGE_ARG_3 = 3;
const EXPECTED_3 = 3;

const IS_FALSE = false;
const IS_TRUE = true;

interface GateChange {
  changedAt: number;
  directionId: string;
  paths: never[];
  receivedAt: number;
  shouldReload: boolean;
}

const change = (directionId: string, changedAt: number): GateChange => ({
  changedAt,
  directionId,
  paths: [],
  receivedAt: changedAt,
  shouldReload: false,
});

describe(SwapQueue, () => {
  it("lets one frame reload at a time and keeps only the newest change per frame", () => {
    expect.hasAssertions();

    const queue = new SwapQueue();
    queue.offer("a", change("a", 1));
    queue.offer("b", change("b", 2));
    queue.offer("b", change("b", CHANGE_ARG_3));
    expect(queue.inFlight).toBe("a");
    expect([...queue.next.keys()]).toStrictEqual(["a"]);
    expect([
      queue.done("b"),
      queue.done("a"),
      queue.shown.get("a")?.changedAt,
      queue.inFlight,
      queue.next.get("b")?.changedAt,
    ]).toStrictEqual([IS_FALSE, IS_TRUE, 1, "b", EXPECTED_3]);
    queue.done("b");
    expect(queue.inFlight).toBeNull();
    expect(queue.next.size).toBe(0);
  }, 0);

  it("gives the back slot up while the live frame holds one, then resumes", () => {
    expect.hasAssertions();

    const queue = new SwapQueue();
    queue.offer("a", change("a", 1));
    expect([queue.hold(true), queue.inFlight, queue.next.size]).toStrictEqual([
      IS_TRUE,
      null,
      0,
    ]);
    queue.offer("b", change("b", 2));
    expect(queue.inFlight).toBeNull();
    queue.hold(false);
    expect(queue.inFlight).toBe("a");
    queue.done("a");
    expect(queue.inFlight).toBe("b");
  }, 0);
});
