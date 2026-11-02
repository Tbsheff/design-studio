import path from "node:path";

import { z } from "zod";

import { EXPORT_MAX_FRAMES, exportFileStem } from "../../shared/export.js";
import { pickExportFrames } from "../export/export-frames.js";
import { writeUnique } from "../export/export-write.js";
import { canvasFrames, type DirectToolDeps } from "./direct-tools.js";

export const EXPORT_FRAME_AGENT_DESCRIPTION =
  "Export canvas frames of this direction as SVG or PPTX with the same server code as Export > SVG and Export > PPTX in the studio and the MCP export_frame tool. SVG: vector boxes, <text> with font names and embedded pictures; selector exports one element. PPTX: one slide per frame (or per .slide / [data-slide] section) with native text boxes, solid and rounded boxes, lines, simple SVG shapes and images over a picture of the rest. Returns the file path in the Design Studio data folder. It changes no design file; use it only when the user asks for an SVG or a deck file.";

export const exportFrameShape = {
  format: z
    .enum(["svg", "pptx"])
    .describe("svg: vector file. pptx: slide deck."),
  frames: z
    .array(z.string().trim().min(1).max(60))
    .min(1)
    .max(EXPORT_MAX_FRAMES)
    .optional()
    .describe(
      "Frame ids or @labels from canvas_list. Leave out for every visible frame."
    ),
  selector: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .optional()
    .describe(
      "SVG only: a CSS selector or layer id of one element of the first frame."
    ),
  area: z
    .enum(["frame", "page"])
    .optional()
    .describe("SVG only: frame (default) or page (full page height)."),
};

const schema = z.object(exportFrameShape).strict();

type ToolText = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

const text = (message: string, isError = false): ToolText => ({
  content: [{ type: "text", text: message }],
  ...(isError ? { isError: true } : {}),
});

export async function runExportFrame(
  deps: DirectToolDeps & { exportsDir?: string | undefined },
  args: z.input<typeof schema>
): Promise<ToolText> {
  const parsed = schema.safeParse(args);

  if (!parsed.success) {
    return text(
      `export_frame: ${parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ")}`,
      true
    );
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
      scope: input.area ?? "frame",
      selector: input.selector,
      name: project.name,
      stem: exportFileStem(project.name),
    });

    const file = await writeUnique(
      path.join(deps.exportsDir, project.id),
      out.name,
      out.bytes
    );

    return text(
      JSON.stringify({
        file,
        format: input.format,
        bytes: out.bytes.byteLength,
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
