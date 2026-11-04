import { Context, Effect, Layer } from "effect";

import type { SkillCatalog } from "../../shared/actions/_core/contracts.js";
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
