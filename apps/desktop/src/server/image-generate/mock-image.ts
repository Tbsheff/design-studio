import { createHash } from "node:crypto";

import { toSize } from "./engine/sizes.js";
import type { Aspect, Style } from "./engine/sizes.js";

interface MockRequest {
  readonly aspect: Aspect;
  readonly prompt: string;
  readonly seed: number;
  readonly style: Style;
}

type Attrs = Readonly<Record<string, number | string>>;

const HUE_SPAN = 360;

const HUE_STEP = 47;

const BYTE_SPAN = 256;

const HALF = 50;

const MIDDLE_STOP = 0.55;

const QUARTER = 4;

const element = (name: string, attrs: Attrs, inner = ""): string => {
  const text = Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  if (inner === "") {
    return `<${name} ${text}/>`;
  }

  return `<${name} ${text}>${inner}</${name}>`;
};

const hueAt = (digest: Buffer, index: number): number =>
  ((digest[index] ?? 0) * HUE_SPAN) / BYTE_SPAN;

const hsl = (hue: number, light: number): string =>
  `hsl(${Math.round(hue) % HUE_SPAN} 70% ${light}%)`;

const stop = (offset: number, hue: number): string =>
  element("stop", { offset, "stop-color": hsl(hue, 55) });

const toDecor = (
  style: Style,
  hue: number,
  width: number,
  height: number
): string => {
  const fill = hsl(hue + HUE_STEP, 85);
  const radius = Math.round(Math.min(width, height) / QUARTER);

  if (style === "icon") {
    return element("circle", {
      cx: width / 2,
      cy: height / 2,
      fill,
      "fill-opacity": 0.85,
      r: radius,
    });
  }

  if (style === "abstract") {
    return (
      element("ellipse", {
        cx: width * 0.3,
        cy: height * 0.35,
        fill,
        "fill-opacity": 0.45,
        rx: radius * 1.4,
        ry: radius,
      }) +
      element("ellipse", {
        cx: width * 0.7,
        cy: height * 0.7,
        fill,
        "fill-opacity": 0.35,
        rx: radius,
        ry: radius * 1.3,
      })
    );
  }

  if (style === "illustration") {
    return element("rect", {
      fill,
      "fill-opacity": 0.5,
      height: height * 0.45,
      width: width * 0.6,
      x: width * 0.2,
      y: height * 0.55,
    });
  }

  return "";
};

const toMockImage = (request: MockRequest): string => {
  const { height, width } = toSize(request.aspect);

  const digest = createHash("sha256")
    .update(
      `${request.prompt}|${request.style}|${request.aspect}|${request.seed}`
    )
    .digest();

  const first = hueAt(digest, 0);
  const second = hueAt(digest, 1);
  const angle = ((digest[2] ?? 0) / BYTE_SPAN) * Math.PI;
  const toX = Math.round(HALF + HALF * Math.cos(angle));
  const toY = Math.round(HALF + HALF * Math.sin(angle));

  const gradient = element(
    "linearGradient",
    { id: "g", x1: "0%", x2: `${toX}%`, y1: "0%", y2: `${toY}%` },
    stop(0, first) +
      stop(MIDDLE_STOP, (first + second) / 2 + HUE_STEP) +
      stop(1, second)
  );

  const body =
    element("defs", {}, gradient) +
    element("rect", { fill: "url(#g)", height, width }) +
    toDecor(request.style, first, width, height);

  return element(
    "svg",
    {
      height,
      viewBox: `0 0 ${width} ${height}`,
      width,
      xmlns: "http://www.w3.org/2000/svg",
    },
    body
  );
};

export { toMockImage };

export type { MockRequest };
