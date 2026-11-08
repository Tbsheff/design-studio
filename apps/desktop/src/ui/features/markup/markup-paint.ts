import {
  HEAD_LENGTH,
  HEAD_SPREAD,
  MARKUP_COLOR,
  NOTE_FONT,
  STROKE_WIDTH,
} from "./markup-model.js";
import type { MarkupPoint, MarkupStroke } from "./markup-model.js";

type PaintContext =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

const NOTE_PAD = 8;

const NOTE_FILL = "#fff7d6";

const NOTE_INK = "#1c1c1e";

const NOTE_GAP = 4;

const BASE64_CHUNK = 0x80_00;

const paintPen = (ctx: PaintContext, points: readonly MarkupPoint[]): void => {
  const [first, ...rest] = points;

  if (!first) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(first.x, first.y);

  for (const point of rest) {
    ctx.lineTo(point.x, point.y);
  }

  ctx.stroke();
};

const paintArrow = (
  ctx: PaintContext,
  from: MarkupPoint,
  to: MarkupPoint
): void => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.beginPath();

  ctx.moveTo(
    to.x + Math.cos(angle + Math.PI - HEAD_SPREAD) * HEAD_LENGTH,
    to.y + Math.sin(angle + Math.PI - HEAD_SPREAD) * HEAD_LENGTH
  );

  ctx.lineTo(to.x, to.y);

  ctx.lineTo(
    to.x + Math.cos(angle + Math.PI + HEAD_SPREAD) * HEAD_LENGTH,
    to.y + Math.sin(angle + Math.PI + HEAD_SPREAD) * HEAD_LENGTH
  );

  ctx.stroke();
};

const paintNote = (ctx: PaintContext, at: MarkupPoint, text: string): void => {
  ctx.font = `600 ${NOTE_FONT}px sans-serif`;
  ctx.textBaseline = "top";
  const { width } = ctx.measureText(text);
  ctx.fillStyle = NOTE_FILL;
  ctx.fillRect(at.x, at.y, width + NOTE_PAD * 2, NOTE_FONT + NOTE_PAD * 2);
  ctx.strokeRect(at.x, at.y, width + NOTE_PAD * 2, NOTE_FONT + NOTE_PAD * 2);
  ctx.fillStyle = NOTE_INK;
  ctx.fillText(text, at.x + NOTE_PAD, at.y + NOTE_PAD + NOTE_GAP / 2);
};

const paintStroke = (ctx: PaintContext, stroke: MarkupStroke): void => {
  if (stroke.kind === "pen") {
    paintPen(ctx, stroke.points);
  } else if (stroke.kind === "arrow") {
    paintArrow(ctx, stroke.from, stroke.to);
  } else if (stroke.kind === "box") {
    ctx.strokeRect(
      Math.min(stroke.from.x, stroke.to.x),
      Math.min(stroke.from.y, stroke.to.y),
      Math.abs(stroke.to.x - stroke.from.x),
      Math.abs(stroke.to.y - stroke.from.y)
    );
  } else {
    paintNote(ctx, stroke.at, stroke.text);
  }
};

const paintMarkup = (
  ctx: PaintContext,
  strokes: readonly MarkupStroke[]
): void => {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = STROKE_WIDTH;
  ctx.strokeStyle = MARKUP_COLOR;

  for (const stroke of strokes) {
    paintStroke(ctx, stroke);
  }
};

const toBase64 = async (file: Blob): Promise<string> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const parts: string[] = [];

  for (let start = 0; start < bytes.length; start += BASE64_CHUNK) {
    parts.push(
      String.fromCodePoint(...bytes.subarray(start, start + BASE64_CHUNK))
    );
  }

  return btoa(parts.join(""));
};

const fromBase64 = (content: string, type: string): Blob =>
  new Blob(
    [Uint8Array.from(atob(content), (char) => char.codePointAt(0) ?? 0)],
    { type }
  );

interface MarkupImage {
  readonly dataUrl: string;
  readonly image: string;
}

const toMarkupImage = async (
  shot: { readonly data: string; readonly mimeType: string },
  size: { readonly height: number; readonly width: number },
  strokes: readonly MarkupStroke[]
): Promise<MarkupImage> => {
  const bitmap = await createImageBitmap(fromBase64(shot.data, shot.mimeType));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is not available");
  }

  ctx.drawImage(bitmap, 0, 0);
  ctx.scale(bitmap.width / size.width, bitmap.height / size.height);
  paintMarkup(ctx, strokes);
  bitmap.close();

  const image = await toBase64(
    await canvas.convertToBlob({ type: "image/png" })
  );

  return { dataUrl: `data:image/png;base64,${image}`, image };
};

export { paintMarkup, toMarkupImage };

export type { MarkupImage };
