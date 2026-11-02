import { Context, Effect, Layer, PubSub, Stream } from "effect";

import type { ActionDone } from "../../shared/actions/app-stream.js";
import type { StudioEvent, StudioEventInput } from "../../shared/contracts.js";
import { boundEventBus } from "./event-core.js";
import type { BoundEventBus } from "./event-core.js";
import { lineOf } from "./event-log.js";
import type { RecordedEvent } from "./event-log.js";

const HUB_SIZE = 5000;

const DONE_SIZE = 500;

interface EventBusApi {
  readonly announce: (done: ActionDone) => Effect.Effect<void>;
  readonly done: () => Stream.Stream<ActionDone>;
  readonly emit: (input: StudioEventInput) => Effect.Effect<StudioEvent>;
  readonly flush: () => Effect.Effect<void>;
  readonly since: (
    projectId: string,
    afterSeq: number
  ) => Effect.Effect<readonly StudioEvent[]>;
  readonly stream: (
    projectId: string,
    afterSeq: number
  ) => Stream.Stream<RecordedEvent>;
}

const busOrDie = Effect.suspend(() => {
  const bus = boundEventBus();

  if (bus === null) {
    return Effect.die("The event bus is not open.");
  }

  return Effect.succeed(bus);
});

const toReplay = (event: StudioEvent): RecordedEvent => ({
  event,
  line: lineOf(event),
});

type HubOf = (
  bus: BoundEventBus,
  projectId: string
) => Effect.Effect<PubSub.PubSub<RecordedEvent>>;

const makeHubs = (): HubOf => {
  const hubs = new Map<string, PubSub.PubSub<RecordedEvent>>();

  const hubOf = Effect.fn("EventBus.hubOf")(function* open(
    bus: BoundEventBus,
    projectId: string
  ) {
    const existing = hubs.get(projectId);

    if (existing) {
      return existing;
    }

    const hub = yield* PubSub.sliding<RecordedEvent>(HUB_SIZE);

    hubs.set(projectId, hub);
    bus.subscribe(projectId, (event, line) => {
      PubSub.publishUnsafe(hub, { event, line });
    });

    return hub;
  });

  return hubOf;
};

const replayThenLive = Effect.fn("EventBus.replayThenLive")(function* open(
  hubOf: HubOf,
  projectId: string,
  afterSeq: number
) {
  const bus = yield* busOrDie;
  const hub = yield* hubOf(bus, projectId);
  const subscription = yield* PubSub.subscribe(hub);
  const replay = yield* Effect.promise(() => bus.since(projectId, afterSeq));
  const lastSeq = replay.at(-1)?.seq ?? afterSeq;

  const live = Stream.fromSubscription(subscription).pipe(
    Stream.filter((recorded) => recorded.event.seq > lastSeq)
  );

  return Stream.concat(
    Stream.fromIterable(replay.map((event) => toReplay(event))),
    live
  );
});

class EventBus extends Context.Service<EventBus, EventBusApi>()(
  "design-studio/events/EventBus"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    EventBus,
    Effect.gen(function* make() {
      const hubOf = makeHubs();
      const doneHub = yield* PubSub.sliding<ActionDone>(DONE_SIZE);

      return EventBus.of({
        announce: Effect.fn("EventBus.announce")(function* run(
          done: ActionDone
        ) {
          yield* PubSub.publish(doneHub, done);
        }),
        done: () => Stream.fromPubSub(doneHub),
        emit: Effect.fn("EventBus.emit")(function* run(
          input: StudioEventInput
        ) {
          const bus = yield* busOrDie;

          return bus.emit(input);
        }),
        flush: Effect.fn("EventBus.flush")(function* run() {
          const bus = yield* busOrDie;

          yield* Effect.promise(() => bus.flush());
        }),
        since: Effect.fn("EventBus.since")(function* run(
          projectId: string,
          afterSeq: number
        ) {
          const bus = yield* busOrDie;

          return yield* Effect.promise(() => bus.since(projectId, afterSeq));
        }),
        stream: (projectId, afterSeq) =>
          Stream.unwrap(replayThenLive(hubOf, projectId, afterSeq)),
      });
    })
  );
}

export { EventBus };

export type { EventBusApi };
