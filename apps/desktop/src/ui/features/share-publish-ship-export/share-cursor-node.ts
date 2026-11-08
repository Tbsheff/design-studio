const SVG_NS = "http://www.w3.org/2000/svg";
const ARROW_PATH = "M1 1l5.5 13 2-5.5L14 6.5z";
const HUE_MULTIPLIER = 31;
const HUE_RANGE = 360;

interface CursorNode {
  readonly element: HTMLDivElement;
  readonly setName: (name: string) => void;
}

const toHue = (id: string): number => {
  let hue = 0;

  for (const character of id) {
    hue = (hue * HUE_MULTIPLIER + (character.codePointAt(0) ?? 0)) % HUE_RANGE;
  }

  return hue;
};

const toCursorKey = (linkId: string, viewer: string): string =>
  `${linkId}:${viewer}`;

const toArrow = (): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", ARROW_PATH);
  path.setAttribute("fill", "currentColor");
  path.setAttribute("stroke", "white");
  path.setAttribute("stroke-width", "1.2");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);

  return svg;
};

const toCursorNode = (hue: number): CursorNode => {
  const element = document.createElement("div");
  element.className = "share-cursor";
  element.dataset["testid"] = "share-viewer-cursor";
  const label = document.createElement("span");
  element.append(toArrow(), label);
  element.style.setProperty("--cursor-hue", String(hue));

  return {
    element,
    setName: (name: string): void => {
      if (label.textContent !== name) {
        label.textContent = name;
      }
    },
  };
};

export { toCursorKey, toCursorNode, toHue };

export type { CursorNode };
