import { BYTE_BITS, toBits, toByte } from "./qr-bits.js";
import { toRemainder } from "./qr-galois.js";
import { MODE_BITS, toCountBits, toDataLength } from "./qr-spec.js";
import type { QrVersionSpec } from "./qr-spec.js";

const BYTE_MODE = 4;
const PAD_FIRST = 236;
const PAD_SECOND = 17;
const PADS = [PAD_FIRST, PAD_SECOND];

const toDataBytes = (
  bytes: readonly number[],
  spec: QrVersionSpec
): readonly number[] => {
  const capacityBits = toDataLength(spec) * BYTE_BITS;

  const bits: number[] = [
    ...toBits(BYTE_MODE, MODE_BITS),
    ...toBits(bytes.length, toCountBits(spec)),
    ...bytes.flatMap((byte) => toBits(byte, BYTE_BITS)),
  ];

  const terminator = Math.min(MODE_BITS, capacityBits - bits.length);
  bits.push(...toBits(0, terminator));
  const padding = (BYTE_BITS - (bits.length % BYTE_BITS)) % BYTE_BITS;
  bits.push(...toBits(0, padding));
  const packed: number[] = [];

  for (let index = 0; index < bits.length; index += BYTE_BITS) {
    packed.push(toByte(bits.slice(index, index + BYTE_BITS)));
  }

  const padCount = toDataLength(spec) - packed.length;

  for (let index = 0; index < padCount; index += 1) {
    packed.push(PADS[index % PADS.length] ?? PAD_FIRST);
  }

  return packed;
};

const toBlocks = (
  data: readonly number[],
  spec: QrVersionSpec
): readonly (readonly number[])[] => {
  const blocks: (readonly number[])[] = [];
  let offset = 0;
  const blockCount = spec.shortBlocks + spec.longBlocks;

  for (let index = 0; index < blockCount; index += 1) {
    let length = spec.shortLength;

    if (index >= spec.shortBlocks) {
      length += 1;
    }

    blocks.push(data.slice(offset, offset + length));
    offset += length;
  }

  return blocks;
};

const toInterleaved = (
  blocks: readonly (readonly number[])[]
): readonly number[] => {
  const longest = Math.max(...blocks.map((block) => block.length));
  const out: number[] = [];

  for (let index = 0; index < longest; index += 1) {
    for (const block of blocks) {
      if (index < block.length) {
        out.push(block[index] ?? 0);
      }
    }
  }

  return out;
};

const toCodewords = (
  bytes: readonly number[],
  spec: QrVersionSpec
): readonly number[] => {
  const dataBlocks = toBlocks(toDataBytes(bytes, spec), spec);
  const ecBlocks = dataBlocks.map((block) => toRemainder(block, spec.ecLength));

  return [...toInterleaved(dataBlocks), ...toInterleaved(ecBlocks)];
};

export { toCodewords };
