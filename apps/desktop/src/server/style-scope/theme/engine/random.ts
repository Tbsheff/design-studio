const MODULUS = 2_147_483_647;

const MULTIPLIER = 48_271;

const HASH_MODULUS = 2_147_483_629;

const HASH_MULTIPLIER = 131;

const HASH_START = 7;

const WARM_UP = 8;

const RADIX = 36;

const ID_WIDTH = 7;

const toHash = (text: string): number => {
  let hash = HASH_START;

  for (const char of text) {
    hash = (hash * HASH_MULTIPLIER + (char.codePointAt(0) ?? 0)) % HASH_MODULUS;
  }

  return hash;
};

const toRandom = (seed: number): (() => number) => {
  let state = (toHash(`seed:${seed}`) % (MODULUS - 1)) + 1;

  const draw = (): number => {
    state = (state * MULTIPLIER) % MODULUS;

    return state / MODULUS;
  };

  for (let step = 0; step < WARM_UP; step += 1) {
    draw();
  }

  return draw;
};

const toIdText = (text: string): string =>
  toHash(text).toString(RADIX).padStart(ID_WIDTH, "0");

const toPick = <Item>(
  random: () => number,
  items: readonly Item[]
): Item | null => items[Math.floor(random() * items.length)] ?? null;

export { toHash, toIdText, toPick, toRandom };
