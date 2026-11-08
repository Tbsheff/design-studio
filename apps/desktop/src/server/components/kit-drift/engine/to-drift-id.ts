const MODULUS_ONE = 1_000_000_007;
const MODULUS_TWO = 998_244_353;
const MULTIPLIER_ONE = 131;
const MULTIPLIER_TWO = 257;
const HEX_RADIX = 16;
const HEX_WIDTH = 8;

const toHash = (text: string, multiplier: number, modulus: number): string => {
  let hash = 0;

  for (const char of text) {
    hash = (hash * multiplier + (char.codePointAt(0) ?? 0)) % modulus;
  }

  return hash.toString(HEX_RADIX).padStart(HEX_WIDTH, "0");
};

const toDriftId = (file: string, line: number, column: number): string => {
  const key = `${file}:${line}:${column}`;

  return `${toHash(key, MULTIPLIER_ONE, MODULUS_ONE)}${toHash(key, MULTIPLIER_TWO, MODULUS_TWO)}`;
};

export { toDriftId };
