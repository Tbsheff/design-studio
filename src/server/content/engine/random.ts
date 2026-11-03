type Random = () => number;

const MIX_A = 0x6d2b79f5;

const MIX_B = 61;

const MIX_SHIFT = 7;

const UINT_RANGE = 4294967296;

const makeRandom = (seed: number): Random => {
  let state = seed >>> 0;

  return () => {
    state = (state + MIX_A) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> MIX_SHIFT), mixed | MIX_B);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT_RANGE;
  };
};

const hashOf = (...parts: readonly number[]): number => {
  let hash = 2166136261;

  for (const part of parts) {
    hash = Math.imul(hash ^ part, 16777619) >>> 0;
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
