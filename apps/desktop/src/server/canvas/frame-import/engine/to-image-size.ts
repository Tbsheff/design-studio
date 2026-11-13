import type { ImageSize } from "@design-studio/contracts/image-frame";

type ImageSizeResult =
  | { readonly ok: true; readonly value: ImageSize }
  | { readonly ok: false; readonly code: "unknown-format" | "bad-header" };

const PNG_SIGNATURE = "\u0089PNG\r\n\u001A\n";

const PNG_WIDTH_AT = 16;

const PNG_HEIGHT_AT = 20;

const PNG_HEADER_END = 24;

const JPEG_MARK = 255;

const JPEG_START = 216;

const JPEG_TEM = 1;

const JPEG_RESTART_FIRST = 208;

const JPEG_RESTART_LAST = 215;

const JPEG_SOF_FIRST = 192;

const JPEG_SOF_LAST = 207;

const JPEG_NOT_SOF_STEP = 4;

const JPEG_SOF_HEIGHT_AT = 5;

const JPEG_SOF_WIDTH_AT = 7;

const JPEG_SOF_END = 9;

const BYTE_BASE = 256;

const UINT32_BYTES = 4;

const BAD_HEADER: ImageSizeResult = { code: "bad-header", ok: false };

const toUint = (bytes: Uint8Array, at: number, length: number): number => {
  let value = 0;

  for (let index = 0; index < length; index += 1) {
    value = value * BYTE_BASE + (bytes[at + index] ?? 0);
  }

  return value;
};

const toUint16 = (bytes: Uint8Array, at: number): number =>
  toUint(bytes, at, 2);

const isPng = (bytes: Uint8Array): boolean =>
  bytes.length >= PNG_HEADER_END &&
  String.fromCodePoint(...bytes.subarray(0, PNG_SIGNATURE.length)) ===
    PNG_SIGNATURE;

const isJpeg = (bytes: Uint8Array): boolean =>
  bytes[0] === JPEG_MARK && bytes[1] === JPEG_START;

const toSizeResult = (width: number, height: number): ImageSizeResult => {
  if (width <= 0 || height <= 0) {
    return BAD_HEADER;
  }

  return { ok: true, value: { height, width } };
};

const isSofMarker = (marker: number): boolean => {
  const step = marker - JPEG_SOF_FIRST;

  return (
    marker <= JPEG_SOF_LAST &&
    step >= 0 &&
    (step === 0 || step % JPEG_NOT_SOF_STEP !== 0)
  );
};

const isStandalone = (marker: number): boolean =>
  marker === JPEG_TEM ||
  (marker >= JPEG_RESTART_FIRST && marker <= JPEG_RESTART_LAST);

const toNextSegment = (bytes: Uint8Array, at: number): number => {
  const marker = bytes[at + 1] ?? 0;

  if (marker === JPEG_MARK) {
    return at + 1;
  }

  if (isStandalone(marker)) {
    return at + 2;
  }

  return at + 2 + toUint16(bytes, at + 2);
};

const toJpegSize = (bytes: Uint8Array): ImageSizeResult => {
  let at = 2;

  while (at + JPEG_SOF_END <= bytes.length) {
    if (bytes[at] !== JPEG_MARK) {
      return BAD_HEADER;
    }

    if (isSofMarker(bytes[at + 1] ?? 0)) {
      return toSizeResult(
        toUint16(bytes, at + JPEG_SOF_WIDTH_AT),
        toUint16(bytes, at + JPEG_SOF_HEIGHT_AT)
      );
    }

    at = toNextSegment(bytes, at);
  }

  return BAD_HEADER;
};

const toImageSize = (bytes: Uint8Array): ImageSizeResult => {
  if (isPng(bytes)) {
    return toSizeResult(
      toUint(bytes, PNG_WIDTH_AT, UINT32_BYTES),
      toUint(bytes, PNG_HEIGHT_AT, UINT32_BYTES)
    );
  }

  if (isJpeg(bytes)) {
    return toJpegSize(bytes);
  }

  return { code: "unknown-format", ok: false };
};

export { toImageSize };

export type { ImageSize, ImageSizeResult };
