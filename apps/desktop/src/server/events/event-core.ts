import type { StudioEvent, StudioEventInput } from "@design-studio/actions/_core/contracts";
import type { EventListener } from "./event-log.js";

interface BoundEventBus {
  readonly emit: (event: StudioEventInput) => StudioEvent;
  readonly flush: () => Promise<void>;
  readonly since: (
    projectId: string,
    afterSeq: number
  ) => Promise<StudioEvent[]>;
  readonly subscribe: (
    projectId: string,
    listener: EventListener
  ) => () => void;
}

interface EventBusSlot {
  bus: BoundEventBus | null;
}

const bound: EventBusSlot = { bus: null };

const bindEventBus = (bus: BoundEventBus): void => {
  bound.bus = bus;
};

const boundEventBus = (): BoundEventBus | null => bound.bus;

export { bindEventBus, boundEventBus };

export type { BoundEventBus };
