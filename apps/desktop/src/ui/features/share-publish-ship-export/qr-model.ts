import { toCodewords } from "./qr-codewords.js";
import {
  drawCodewords,
  drawFormat,
  drawPatterns,
  drawVersion,
  toGrid,
} from "./qr-grid.js";
import { toBestMasked } from "./qr-mask.js";
import { toSpec } from "./qr-spec.js";

interface QrCode {
  readonly size: number;
  readonly path: string;
}

const QUIET_ZONE = 4;

const toRunPath = (
  line: readonly boolean[],
  row: number
): readonly string[] => {
  const parts: string[] = [];
  let column = 0;

  while (column < line.length) {
    const start = column;

    while (line[column] === true) {
      column += 1;
    }

    if (column > start) {
      const length = column - start;
      parts.push(
        `M${start + QUIET_ZONE},${row + QUIET_ZONE}h${length}v1h-${length}z`
      );
    }

    column += 1;
  }

  return parts;
};

const toQrPath = (dark: readonly (readonly boolean[])[]): string =>
  dark.flatMap((line, row) => toRunPath(line, row)).join("");

const toQrCode = (text: string): QrCode | null => {
  const bytes = [...new TextEncoder().encode(text)];
  const spec = toSpec(bytes.length);

  if (spec === null) {
    return null;
  }

  const grid = toGrid(spec);
  drawPatterns(grid, spec);
  drawFormat(grid, 0);
  drawVersion(grid, spec.version);
  drawCodewords(grid, toCodewords(bytes, spec));
  const finished = toBestMasked(grid);

  return {
    path: toQrPath(finished.dark),
    size: finished.size + QUIET_ZONE * 2,
  };
};

export { toQrCode };

export type { QrCode };
