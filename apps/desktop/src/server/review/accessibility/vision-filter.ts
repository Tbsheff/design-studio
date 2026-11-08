import {
  BLUR_RADIUS_PX,
  CONTRAST_SCALE,
  hasBlurFilter,
  toFilterMatrix,
} from "./engine/vision-matrix.js";
import type { Matrix, VisionKind } from "./engine/vision-matrix.js";

const FILTER_ID = "ds-vision-filter";

const SVG_ID = "ds-vision-svg";

const toMatrixValues = (matrix: Matrix): string =>
  [
    ...[matrix.red, matrix.green, matrix.blue].map(
      (row) => `${row.red} ${row.green} ${row.blue} 0 0`
    ),
    "0 0 0 1 0",
  ].join(" ");

const toCssFilter = (kind: VisionKind): string => {
  if (hasBlurFilter(kind)) {
    return `blur(${BLUR_RADIUS_PX}px)`;
  }

  if (kind === "reduced-contrast") {
    return `contrast(${CONTRAST_SCALE})`;
  }

  return `url(#${FILTER_ID})`;
};

const toFilterValues = (kind: VisionKind): string => {
  const matrix = toFilterMatrix(kind);

  if (matrix === null) {
    return "";
  }

  return toMatrixValues(matrix);
};

const toResetScript = (): string =>
  `(() => { document.getElementById(${JSON.stringify(SVG_ID)})?.remove(); document.documentElement.style.filter = ''; return true; })()`;

const toVisionScript = (kind: VisionKind): string =>
  `(() => {
    document.getElementById(${JSON.stringify(SVG_ID)})?.remove();
    const values = ${JSON.stringify(toFilterValues(kind))};
    if (values) {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.id = ${JSON.stringify(SVG_ID)};
      svg.setAttribute('width', '0');
      svg.setAttribute('height', '0');
      svg.style.position = 'absolute';
      const filter = document.createElementNS(ns, 'filter');
      filter.id = ${JSON.stringify(FILTER_ID)};
      filter.setAttribute('color-interpolation-filters', 'linearRGB');
      const matrix = document.createElementNS(ns, 'feColorMatrix');
      matrix.setAttribute('type', 'matrix');
      matrix.setAttribute('values', values);
      filter.appendChild(matrix);
      svg.appendChild(filter);
      document.body.appendChild(svg);
    }
    document.documentElement.style.filter = ${JSON.stringify(toCssFilter(kind))};
    return true;
  })()`;

export { toResetScript, toVisionScript };
