import path from "node:path";

import { Schema } from "effect";

import { EXPORT_MAX_FRAMES, exportFileStem } from "@design-studio/actions/_core/export";
import {
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs } from "../agent-tools/index.js";
import { pickExportFrames } from "../export/export-frames.js";
import { writeUnique } from "../export/export-write.js";
import { canvasFrames } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";

export const EXPORT_FRAME_AGENT_DESCRIPTION =
  "Export canvas frames of this direction as SVG or PPTX with the same server code as Export > SVG and Export > PPTX in the studio and the MCP export_frame tool. SVG: vector boxes, <text> with font names and embedded pictures; selector exports one element. PPTX: one slide per frame (or per .slide / [data-slide] section) with native text boxes, solid and rounded boxes, lines, simple SVG shapes and images over a picture of the rest. Returns the file path in the Design Studio data folder. It changes no design file; use it only when the user asks for an SVG or a deck file.";

const exportFrameFields = {
  area: Schema.optionalKey(
    Schema.Literals(["frame", "page"]).annotate({
      description: "SVG only: frame (default) or page (full page height).",
    })
  ),
  format: Schema.Literals(["svg", "pptx"]).annotate({
    description: "svg: vector file. pptx: slide deck.",
  }),
  frames: Schema.optionalKey(
    Schema.Array(toTrimmedText(1, 60))
      .check(Schema.isMinLength(1), Schema.isMaxLength(EXPORT_MAX_FRAMES))
      .annotate({
        description:
          "Frame ids or @labels from canvas_list. Leave out for every visible frame.",
      })
  ),
  selector: toOptionalText(
    1,
    2000,
    "SVG only: a CSS selector or layer id of one element of the first frame."
  ),
};

export const exportFrameShape = toSdkFieldSet(exportFrameFields);

const schema = toToolInput(exportFrameFields);

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const text = (message: string, isError = false): ToolText => ({
  content: [{ text: message, type: "text" }],
  ...(isError ? { isError: true } : {}),
});

export async function runExportFrame(
  deps: DirectToolDeps & { exportsDir?: string | undefined },
  args: ToolArgs<typeof schema>
): Promise<ToolText> {
  const parsed = schema.safeParse(args);

  if (!parsed.success) {
    return text(`export_frame: ${parsed.error}`, true);
  }

  const input = parsed.data;

  if (!deps.exportsDir) {
    return text("export_frame is not available in this run.", true);
  }

  if (input.selector && input.format === "pptx") {
    return text("selector works with format svg only.", true);
  }

  const { project, direction } = deps.ctx;

  try {
    const pick = pickExportFrames(
      await canvasFrames(deps),
      direction.id,
      input.frames ?? null
    );

    if (!pick.ok) {
      return text(pick.message, true);
    }

    const picked = input.selector ? pick.frames.slice(0, 1) : pick.frames;

    const url =
      deps.ctx.previewUrl ??
      (await deps.preview.directionUrl(project, direction));

    const { exportVector } = await import("../export/vector-export.js");

    const out = await exportVector(deps.preview, url, {
      format: input.format,
      frames: picked,
      name: project.name,
      scope: input.area ?? "frame",
      selector: input.selector,
      stem: exportFileStem(project.name),
    });

    const file = await writeUnique(
      path.join(deps.exportsDir, project.id),
      out.name,
      out.bytes
    );

    return text(
      JSON.stringify({
        bytes: out.bytes.byteLength,
        file,
        format: input.format,
        frames: picked.map((frame) => frame.name),
        ...(out.note ? { note: out.note } : {}),
      })
    );
  } catch (error) {
    return text(
      `export_frame failed: ${error instanceof Error ? error.message : String(error)}`,
      true
    );
  }
}
