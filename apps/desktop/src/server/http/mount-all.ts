import { AllActions } from "@design-studio/actions";
import type { AnyAction } from "@design-studio/actions/_core/action";
import type { Hono } from "hono";

import { ALL_ENTRIES } from "../handlers/_core/all-entries.generated.js";
import type { Entries } from "../handlers/_core/handler.js";
import type { StudioRuntime } from "../platform/studio-runtime/index.js";
import { mountActions } from "./mount.js";

type Group = Readonly<Record<string, AnyAction>>;

type Domain = keyof typeof AllActions;

const mountAll = (app: Hono, runtime: StudioRuntime): void => {
  for (const domain of Object.keys(AllActions) as Domain[]) {
    const actions: Group = AllActions[domain];
    const entries = ALL_ENTRIES[domain] as Entries<Group>;

    mountActions(app, actions, entries, runtime);
  }
};

export { mountAll };
