import type { Hono } from "hono";

import type { AnyAction } from "../../shared/actions/_core/action.js";
import { AllActions } from "../../shared/actions/index.js";
import type { Entries } from "../handlers/_core/handler.js";
import { ALL_ENTRIES } from "../handlers/all-entries.generated.js";
import type { StudioRuntime } from "../main/runtime.js";
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
