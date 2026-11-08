import type { ManagedRuntime } from "effect";

interface StudioServiceGroups {
  readonly base: never;
}

type StudioServices = StudioServiceGroups[keyof StudioServiceGroups];

type StudioRuntime = ManagedRuntime.ManagedRuntime<StudioServices, never>;

export type { StudioRuntime, StudioServiceGroups, StudioServices };
