import {
  toDeviceFrame,
  toDeviceOuterSize,
} from "@design-studio/contracts/device-frame";
import type {
  DeviceFrameId,
  DeviceFrameSpec,
} from "@design-studio/contracts/device-frame";

import { toMockupPalette } from "./mockup-palette.js";
import type { MockupPalette, MockupScheme } from "./mockup-palette.js";

interface MockupHtmlRequest {
  readonly device: DeviceFrameId;
  readonly pngBase64: string;
  readonly scheme: MockupScheme;
}

type StyleMap = Readonly<Record<string, number | string>>;

const ISLAND_WIDTH = 112;
const ISLAND_HEIGHT = 32;
const ISLAND_TOP = 10;
const DOT_SIZE = 10;
const CAMERA_DOT = 8;
const NOTCH_WIDTH = 140;
const NOTCH_HEIGHT = 20;
const NOTCH_RADIUS = 12;
const URL_HEIGHT = 26;
const URL_INSET = 120;
const CHROME_DOT = 12;
const CHROME_DOT_GAP = 8;
const CHROME_DOT_LEFT = 16;
const HALF = 2;
const LIGHTS = ["#ff5f57", "#febc2e", "#28c840"];

const OPEN = "<";
const CLOSE = ">";

const toPx = (value: number): string => `${value}px`;

const toCss = (styles: StyleMap): string =>
  Object.entries(styles)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");

const toTag = (
  name: string,
  attributes: Readonly<Record<string, string>>,
  inner: string
): string => {
  const pairs = Object.entries(attributes).map(
    ([key, value]) => ` ${key}="${value}"`
  );

  return [OPEN, name, ...pairs, CLOSE, inner, OPEN, "/", name, CLOSE].join("");
};

const toBox = (styles: StyleMap): string =>
  toTag("div", { style: toCss({ position: "absolute", ...styles }) }, "");

const toCenterX = (spec: DeviceFrameSpec, width: number): number =>
  spec.insets.left + (spec.screenWidth - width) / HALF;

const toDot = (
  color: string,
  left: number,
  top: number,
  size: number
): string =>
  toBox({
    background: color,
    "border-radius": "50%",
    height: toPx(size),
    left: toPx(left),
    top: toPx(top),
    width: toPx(size),
  });

const toIsland = (palette: MockupPalette, spec: DeviceFrameSpec): string =>
  toBox({
    background: palette.lens,
    "border-radius": toPx(ISLAND_HEIGHT / HALF),
    height: toPx(ISLAND_HEIGHT),
    left: toPx(toCenterX(spec, ISLAND_WIDTH)),
    top: toPx(spec.insets.top + ISLAND_TOP),
    width: toPx(ISLAND_WIDTH),
  });

const toNotch = (palette: MockupPalette, spec: DeviceFrameSpec): string =>
  toBox({
    background: palette.lens,
    "border-radius": `0 0 ${toPx(NOTCH_RADIUS)} ${toPx(NOTCH_RADIUS)}`,
    height: toPx(NOTCH_HEIGHT),
    left: toPx(toCenterX(spec, NOTCH_WIDTH)),
    top: toPx(spec.insets.top),
    width: toPx(NOTCH_WIDTH),
  });

const toTabletCamera = (
  palette: MockupPalette,
  spec: DeviceFrameSpec
): string =>
  toDot(
    palette.lens,
    (spec.insets.left - CAMERA_DOT) / HALF,
    spec.insets.top + spec.screenHeight / HALF,
    CAMERA_DOT
  );

const toPhoneCamera = (palette: MockupPalette, spec: DeviceFrameSpec): string =>
  toDot(
    palette.lens,
    toCenterX(spec, DOT_SIZE),
    spec.insets.top + ISLAND_TOP,
    DOT_SIZE
  );

const toLights = (spec: DeviceFrameSpec): string =>
  LIGHTS.map((color, index) =>
    toDot(
      color,
      CHROME_DOT_LEFT + index * (CHROME_DOT + CHROME_DOT_GAP),
      (spec.insets.top - CHROME_DOT) / HALF,
      CHROME_DOT
    )
  ).join("");

const toBrowserBar = (
  palette: MockupPalette,
  spec: DeviceFrameSpec
): string => {
  const bar = toBox({
    background: palette.chrome,
    "border-bottom": `1px solid ${palette.edge}`,
    "border-radius": `${toPx(spec.outerRadius)} ${toPx(spec.outerRadius)} 0 0`,
    height: toPx(spec.insets.top),
    left: 0,
    top: 0,
    width: toPx(spec.screenWidth),
  });

  const field = toBox({
    background: palette.urlField,
    border: `1px solid ${palette.edge}`,
    "border-radius": toPx(URL_HEIGHT / HALF),
    "box-sizing": "border-box",
    height: toPx(URL_HEIGHT),
    left: toPx(URL_INSET),
    right: toPx(URL_INSET),
    top: toPx((spec.insets.top - URL_HEIGHT) / HALF),
  });

  return bar + toLights(spec) + field;
};

const toLens = (
  device: DeviceFrameId,
  palette: MockupPalette,
  spec: DeviceFrameSpec
): string => {
  if (device === "iphone-15") {
    return toIsland(palette, spec);
  }

  if (device === "pixel-8") {
    return toPhoneCamera(palette, spec);
  }

  if (device === "ipad") {
    return toTabletCamera(palette, spec);
  }

  if (device === "macbook") {
    return toNotch(palette, spec);
  }

  return toBrowserBar(palette, spec);
};

const toBodyBox = (palette: MockupPalette, spec: DeviceFrameSpec): string => {
  const size = toDeviceOuterSize(spec.id);

  return toBox({
    background: palette.body,
    border: `1px solid ${palette.edge}`,
    "border-radius": toPx(spec.outerRadius),
    "box-shadow": `inset 0 0 0 2px ${palette.stage}`,
    "box-sizing": "border-box",
    height: toPx(size.height),
    left: 0,
    top: 0,
    width: toPx(size.width),
  });
};

const toScreenBox = (spec: DeviceFrameSpec, pngBase64: string): string => {
  const image = toTag(
    "img",
    {
      alt: "",
      src: `data:image/png;base64,${pngBase64}`,
      style: toCss({ display: "block", height: "100%", width: "100%" }),
    },
    ""
  );

  return toTag(
    "div",
    {
      style: toCss({
        "border-radius": toPx(spec.screenRadius),
        height: toPx(spec.screenHeight),
        left: toPx(spec.insets.left),
        overflow: "hidden",
        position: "absolute",
        top: toPx(spec.insets.top),
        width: toPx(spec.screenWidth),
      }),
    },
    image
  );
};

const toPageStyle = (palette: MockupPalette, spec: DeviceFrameSpec): string => {
  const size = toDeviceOuterSize(spec.id);

  return toCss({
    background: palette.stage,
    height: toPx(size.height),
    margin: 0,
    overflow: "hidden",
    padding: 0,
    width: toPx(size.width),
  });
};

const toMockupHtml = (request: MockupHtmlRequest): string => {
  const spec = toDeviceFrame(request.device);
  const palette = toMockupPalette(request.scheme);
  const style = toPageStyle(palette, spec);

  const content =
    toBodyBox(palette, spec) +
    toScreenBox(spec, request.pngBase64) +
    toLens(request.device, palette, spec);

  const head = toTag("style", {}, `html,body{${style}}`);
  const body = toTag("body", {}, content);

  return [OPEN, "!doctype html", CLOSE, toTag("html", {}, head + body)].join(
    ""
  );
};

export { toMockupHtml };

export type { MockupHtmlRequest };
