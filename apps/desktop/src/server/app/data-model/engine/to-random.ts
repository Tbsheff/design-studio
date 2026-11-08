interface Random {
  readonly next: () => number;
  readonly pick: <Value>(values: readonly Value[]) => Value | null;
  readonly toInt: (min: number, max: number) => number;
}

const MODULUS = 2_147_483_647;

const MULTIPLIER = 48_271;

const HASH_BASE = 131;

const HASH_START = 7;

const SEED_STEP = 104_729;

const toHash = (text: string): number => {
  let hash = HASH_START;

  for (const char of text) {
    hash = (hash * HASH_BASE + (char.codePointAt(0) ?? 0)) % MODULUS;
  }

  return hash;
};

const toStart = (seed: number, scope: string): number => {
  const mixed = (toHash(scope) + (Math.abs(seed) + 1) * SEED_STEP) % MODULUS;
  const squared = Number((BigInt(mixed) * BigInt(mixed)) % BigInt(MODULUS));

  if (squared === 0) {
    return 1;
  }

  return squared;
};

const toRandom = (seed: number, scope: string): Random => {
  let state = toStart(seed, scope);

  const next = (): number => {
    state = (state * MULTIPLIER) % MODULUS;

    return state / MODULUS;
  };

  return {
    next,
    pick: (values) => values[Math.floor(next() * values.length)] ?? null,
    toInt: (min, max) => min + Math.floor(next() * (max - min + 1)),
  };
};

export { toRandom };

export type { Random };
