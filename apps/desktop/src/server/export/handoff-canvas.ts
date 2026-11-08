import { CANVAS_FILE } from "@design-studio/contracts/canvas-file";
import type {
  CanvasFile,
  CanvasFileFrame,
} from "@design-studio/contracts/canvas-file";

const toCell = (value: string): string =>
  value
    .replaceAll("|", String.raw`\|`)
    .replaceAll(/\s+/gu, " ")
    .trim();

const toPageText = (frame: CanvasFileFrame): string => {
  if ((frame.path ?? "") === "") {
    return "entry page";
  }

  return `\`${toCell(frame.path ?? "")}\``;
};

const toHiddenText = (frame: CanvasFileFrame): string => {
  if (frame.hidden === true) {
    return " (hidden)";
  }

  return "";
};

const toFrameRow = (frame: CanvasFileFrame): string =>
  `| ${frame.id} | ${toCell(frame.label ?? "")} | ${toPageText(frame)} | ${frame.width} × ${frame.height} | ${frame.x}, ${frame.y}${toHiddenText(frame)} |`;

const toCanvasLines = (canvas: CanvasFile | null): string[] => {
  if (canvas === null || canvas.frames.length === 0) {
    return ["No saved canvas layout.", ""];
  }

  return [
    `\`source/${CANVAS_FILE}\` is the canvas layout: the frames the designer placed, in order.`,
    "",
    "| Frame | Label | Page | Size | Position |",
    "| --- | --- | --- | --- | --- |",
    ...canvas.frames.map((frame) => toFrameRow(frame)),
    "",
  ];
};

export { toCanvasLines };
