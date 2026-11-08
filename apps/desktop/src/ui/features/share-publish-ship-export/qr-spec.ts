interface QrVersionSpec {
  readonly version: number;
  readonly size: number;
  readonly ecLength: number;
  readonly shortBlocks: number;
  readonly shortLength: number;
  readonly longBlocks: number;
  readonly centers: readonly number[];
}

const SPEC_TABLE =
  "10,1,16,0;16,1,28,0;26,1,44,0;18,2,32,0;24,2,43,0;16,4,27,0;18,4,31,0;22,2,38,2;22,3,36,2;26,4,43,1";

const BASE_SIZE = 17;
const SIZE_STEP = 4;
const TIMING_INDEX = 6;
const FINDER_SPAN = 7;
const ALIGN_GROUP = 7;
const LARGE_COUNT_FROM = 10;
const LARGE_COUNT_BITS = 16;
const SMALL_COUNT_BITS = 8;
const MODE_BITS = 4;

const toCenters = (version: number, size: number): readonly number[] => {
  if (version === 1) {
    return [];
  }

  const count = Math.floor(version / ALIGN_GROUP) + 2;

  const step =
    Math.ceil((version * SIZE_STEP + SIZE_STEP) / (count * 2 - 2)) * 2;

  const last = size - FINDER_SPAN;

  return [
    TIMING_INDEX,
    ...Array.from(
      { length: count - 1 },
      (_unused, index) => last - step * (count - 2 - index)
    ),
  ];
};

const toSpecs = (): readonly QrVersionSpec[] =>
  SPEC_TABLE.split(";").map((row, index) => {
    const [ecLength = 0, shortBlocks = 0, shortLength = 0, longBlocks = 0] = row
      .split(",")
      .map(Number);

    const version = index + 1;
    const size = BASE_SIZE + version * SIZE_STEP;

    return {
      centers: toCenters(version, size),
      ecLength,
      longBlocks,
      shortBlocks,
      shortLength,
      size,
      version,
    };
  });

const QR_SPECS = toSpecs();

const toDataLength = (spec: QrVersionSpec): number =>
  spec.shortBlocks * spec.shortLength +
  spec.longBlocks * (spec.shortLength + 1);

const toCountBits = (spec: QrVersionSpec): number => {
  if (spec.version >= LARGE_COUNT_FROM) {
    return LARGE_COUNT_BITS;
  }

  return SMALL_COUNT_BITS;
};

const toSpec = (byteCount: number): QrVersionSpec | null => {
  const bitsPerByte = SMALL_COUNT_BITS;

  return (
    QR_SPECS.find(
      (spec) =>
        MODE_BITS + toCountBits(spec) + byteCount * bitsPerByte <=
        toDataLength(spec) * bitsPerByte
    ) ?? null
  );
};

export { MODE_BITS, TIMING_INDEX, toCountBits, toDataLength, toSpec };

export type { QrVersionSpec };
