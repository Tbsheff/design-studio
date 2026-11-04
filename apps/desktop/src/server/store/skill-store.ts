import { Context, Effect, Layer } from "effect";

import type { SkillCatalog } from "@design-studio/actions/_core/contracts";
import { discoverSkills } from "../agent/skills.js";

interface SkillStoreApi {
  readonly list: () => Effect.Effect<SkillCatalog>;
}

class SkillStore extends Context.Service<SkillStore, SkillStoreApi>()(
  "design-studio/store/SkillStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    SkillStore,
    SkillStore.of({
      list: Effect.fn("SkillStore.list")(function* run() {
        return yield* Effect.promise(() => discoverSkills());
      }),
    })
  );
}

export { SkillStore };

export type { SkillStoreApi };
