type Random = () => number;

const MIX_A = 0x6d_2b_79_f5;

const MIX_B = 61;

const MIX_SHIFT = 7;

const UINT_RANGE = 4_294_967_296;

const SHIFT_HIGH = 15;

const SHIFT_LOW = 14;

const HASH_START = 2_166_136_261;

const HASH_PRIME = 16_777_619;

const makeRandom = (seed: number): Random => {
  let state = seed >>> 0;

  return () => {
    state = (state + MIX_A) >>> 0;
    let mixed = Math.imul(state ^ (state >>> SHIFT_HIGH), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> MIX_SHIFT), mixed | MIX_B);

    return ((mixed ^ (mixed >>> SHIFT_LOW)) >>> 0) / UINT_RANGE;
  };
};

const hashOf = (...parts: readonly number[]): number => {
  let hash = HASH_START;

  for (const part of parts) {
    hash = Math.imul(hash ^ part, HASH_PRIME) >>> 0;
  }

  return hash;
};

const pickFrom = <Value>(list: readonly Value[], random: Random): Value => {
  const index = Math.floor(random() * list.length);

  return list[index] as Value;
};

const intBetween = (low: number, high: number, random: Random): number =>
  low + Math.floor(random() * (high - low + 1));

export { hashOf, intBetween, makeRandom, pickFrom };

export type { Random };
