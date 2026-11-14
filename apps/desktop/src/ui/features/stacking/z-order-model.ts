import type { SelectionStack, StackPeer } from "./deps.js";

type ZStep = "back" | "backward" | "forward" | "front";

type ZStop = "back" | "front" | "no-overlap" | "no-source";

interface ZWrite {
  readonly peer: StackPeer;
  readonly position: "relative" | null;
  readonly zIndex: string;
}

type ZPlan =
  | { readonly kind: "stop"; readonly stop: ZStop }
  | { readonly kind: "write"; readonly writes: readonly ZWrite[] };

type PaintKey = readonly [number, number, number];

const isZApplied = (peer: StackPeer): boolean =>
  peer.position !== "static" || peer.isStackItem;

const toEffectiveZ = (peer: StackPeer): number => {
  if (isZApplied(peer) && peer.z !== null) {
    return peer.z;
  }

  return 0;
};

const toTier = (peer: StackPeer): number => {
  if (peer.position !== "static" || peer.makesLayer) {
    return 1;
  }

  if (peer.isStackItem && peer.z !== null) {
    return 1;
  }

  return 0;
};

const toPaintKey = (peer: StackPeer): PaintKey => [
  toEffectiveZ(peer),
  toTier(peer),
  peer.domIndex,
];

const toKeyWith = (peer: StackPeer, z: number): PaintKey => [
  z,
  1,
  peer.domIndex,
];

const toCompare = (one: PaintKey, two: PaintKey): number => {
  if (one[0] !== two[0]) {
    return one[0] - two[0];
  }

  if (one[1] !== two[1]) {
    return one[1] - two[1];
  }

  return one[2] - two[2];
};

const toWrite = (peer: StackPeer, z: number): ZWrite => {
  let position: ZWrite["position"] = null;

  if (peer.position === "static" && !peer.isStackItem) {
    position = "relative";
  }

  return { peer, position, zIndex: String(z) };
};

const toWritePlan = (peer: StackPeer, z: number): ZPlan => {
  if (peer.source === null) {
    return { kind: "stop", stop: "no-source" };
  }

  return { kind: "write", writes: [toWrite(peer, z)] };
};

const toNearest = (
  peers: readonly StackPeer[],
  isWanted: (peer: StackPeer) => boolean,
  sign: 1 | -1
): StackPeer | null => {
  let nearest: StackPeer | null = null;

  for (const peer of peers) {
    const isCloser =
      nearest === null ||
      sign * toCompare(toPaintKey(peer), toPaintKey(nearest)) < 0;

    if (isWanted(peer) && isCloser) {
      nearest = peer;
    }
  }

  return nearest;
};

const toForwardPlan = (stack: SelectionStack): ZPlan => {
  const own = toPaintKey(stack.self);

  const nearest = toNearest(
    stack.peers,
    (peer) => toCompare(toPaintKey(peer), own) > 0,
    1
  );

  if (nearest === null) {
    return { kind: "stop", stop: "front" };
  }

  const base = toEffectiveZ(nearest);

  const passes = [base, base + 1].find(
    (z) =>
      z >= 0 && toCompare(toKeyWith(stack.self, z), toPaintKey(nearest)) > 0
  );

  return toWritePlan(stack.self, passes ?? base + 1);
};

const toRaisePlan = (stack: SelectionStack, nearest: StackPeer): ZPlan =>
  toWritePlan(nearest, toEffectiveZ(stack.self) + 1);

const toBackwardPlan = (stack: SelectionStack): ZPlan => {
  const own = toPaintKey(stack.self);

  const nearest = toNearest(
    stack.peers,
    (peer) => toCompare(toPaintKey(peer), own) < 0,
    -1
  );

  if (nearest === null) {
    return { kind: "stop", stop: "back" };
  }

  const base = toEffectiveZ(nearest);

  const passes =
    [base, base - 1].find(
      (z) =>
        z >= 0 && toCompare(toKeyWith(stack.self, z), toPaintKey(nearest)) < 0
    ) ?? null;

  if (passes === null) {
    return toRaisePlan(stack, nearest);
  }

  return toWritePlan(stack.self, passes);
};

const toTopPeer = (peers: readonly StackPeer[]): StackPeer | null =>
  toNearest(peers, () => true, -1);

const toFrontPlan = (stack: SelectionStack): ZPlan => {
  const top = toTopPeer(stack.peers);

  if (top === null || toCompare(toPaintKey(stack.self), toPaintKey(top)) > 0) {
    return { kind: "stop", stop: "front" };
  }

  const base = toEffectiveZ(top);

  const passes = [base, base + 1].find(
    (z) => z >= 0 && toCompare(toKeyWith(stack.self, z), toPaintKey(top)) > 0
  );

  return toWritePlan(stack.self, passes ?? base + 1);
};

const isUnder = (stack: SelectionStack): boolean =>
  stack.peers.every(
    (peer) => toCompare(toPaintKey(stack.self), toPaintKey(peer)) < 0
  );

const toBackPlan = (stack: SelectionStack): ZPlan => {
  if (isUnder(stack)) {
    return { kind: "stop", stop: "back" };
  }

  const floor = toKeyWith(stack.self, 0);

  const raised = stack.peers.filter(
    (peer) => toCompare(toPaintKey(peer), floor) < 0
  );

  if (raised.some((peer) => peer.source === null)) {
    return { kind: "stop", stop: "no-source" };
  }

  const raises = raised.map((peer) => toWrite(peer, 1));

  if (isZApplied(stack.self) && stack.self.z === 0) {
    return { kind: "write", writes: raises };
  }

  const self = toWritePlan(stack.self, 0);

  if (self.kind === "stop") {
    return self;
  }

  return { kind: "write", writes: [...raises, ...self.writes] };
};

const PLAN_OF_STEP = {
  back: toBackPlan,
  backward: toBackwardPlan,
  forward: toForwardPlan,
  front: toFrontPlan,
} as const satisfies Record<ZStep, (stack: SelectionStack) => ZPlan>;

const toZPlan = (stack: SelectionStack | null, step: ZStep): ZPlan => {
  if (stack === null || stack.peers.length === 0) {
    return { kind: "stop", stop: "no-overlap" };
  }

  return PLAN_OF_STEP[step](stack);
};

export { toPaintKey, toCompare, toZPlan };

export type { ZPlan, ZStep, ZStop, ZWrite };
