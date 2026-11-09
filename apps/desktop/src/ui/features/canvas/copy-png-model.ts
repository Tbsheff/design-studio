import type { ExportFileResultWire } from "@design-studio/actions/export/schema";

import { frameName } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";

interface PngSize {
  readonly height: number;
  readonly width: number;
}

interface CopyPngFrame {
  readonly height: number;
  readonly name: string;
  readonly path?: string;
  readonly width: number;
}

interface DecodedPng {
  readonly blob: Blob;
  readonly size: PngSize | null;
}

const PNG_SCALE = 2;
const IHDR_WIDTH_AT = 16;
const IHDR_HEIGHT_AT = 20;
const IHDR_END = 24;
const NOTICE_MS = 3200;

const toBytes = (content: string): Uint8Array<ArrayBuffer> => {
  const raw = atob(content);
  const bytes = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.codePointAt(index) ?? 0;
  }

  return bytes;
};

const toPngSize = (bytes: Uint8Array): PngSize | null => {
  if (bytes.length < IHDR_END) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return {
    height: view.getUint32(IHDR_HEIGHT_AT),
    width: view.getUint32(IHDR_WIDTH_AT),
  };
};

const toDecodedPng = (file: ExportFileResultWire): DecodedPng => {
  const bytes = toBytes(file.content);

  return {
    blob: new Blob([bytes], { type: "image/png" }),
    size: toPngSize(bytes),
  };
};

const toCopyFrame = (frame: CanvasFrame): CopyPngFrame => {
  const base = { height: frame.height, width: frame.width };

  if (frame.path) {
    return {
      ...base,
      name: frame.label?.trim() || frameName(frame),
      path: frame.path,
    };
  }

  return { ...base, name: frame.label?.trim() || frameName(frame) };
};

const toCopiedText = (size: PngSize | null): string => {
  if (size === null) {
    return "Copied";
  }

  return `Copied ${size.width} × ${size.height} px`;
};

export {
  NOTICE_MS,
  PNG_SCALE,
  toCopiedText,
  toCopyFrame,
  toDecodedPng,
  toPngSize,
};

export type { CopyPngFrame, DecodedPng, PngSize };
