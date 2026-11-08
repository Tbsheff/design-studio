import type { StoredTheme } from "./theme-model.js";

const SEED_LIMIT = 2_147_483_000;

const FIRST_SEED = 1;

const HASH_MULTIPLIER = 31;

const toSeedOf = (previous: readonly StoredTheme[]): number => {
  if (previous.length === 0) {
    return FIRST_SEED;
  }

  let hash = FIRST_SEED;

  for (const item of previous) {
    hash = (hash * HASH_MULTIPLIER + item.seed + item.id.length) % SEED_LIMIT;
  }

  return hash;
};

export { toSeedOf };
