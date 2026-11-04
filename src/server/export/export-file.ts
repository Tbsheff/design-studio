import type { ProjectKind } from "../../shared/contracts.js";
import { exportFileStem } from "../../shared/export.js";
import type {
  ExportFrame,
  ExportScale,
  ExportScope,
} from "../../shared/export.js";
import type { ZipEntry } from "../design-system/zip.js";
import type { Shot } from "../preview/index.js";
import type { ExportRuntime } from "./export-core.js";
import { parseFrames, parseScale, resolveSource } from "./source.js";
import type { VectorRequest } from "./vector-export.js";

type FileFormat = "html" | "pdf" | "png" | "pptx" | "svg" | "zip";

interface ExportedBytes {
  readonly bytes: Uint8Array;
  readonly name: string;
  readonly note: string | null;
  readonly type: string;
}

interface FileRequest {
  readonly format: FileFormat;
  readonly frames: readonly ExportFrame[] | null;
  readonly projectId: string;
  readonly scale: ExportScale | null;
  readonly scope: ExportScope | null;
  readonly selector: string | null;
  readonly versionId: string;
}

interface ImageJob {
  readonly frames: ExportFrame[];
  readonly name: string;
  readonly runtime: ExportRuntime;
  readonly scale: ExportScale;
  readonly scope: ExportScope;
  readonly selector: string | null;
  readonly stem: string;
  readonly url: string;
}

interface InlinedPage {
  readonly frame: ExportFrame;
  readonly html: string;
  readonly missing: readonly string[];
}

const ZIP = "application/zip";
const PDF_SCALE = 2;
const VERSION_TAG = 7;

const toBytes = (
  bytes: Uint8Array,
  type: string,
  name: string,
  note: string | null
): ExportedBytes => ({ bytes, name, note, type });

const mapInOrder = async <Item, Out>(
  items: readonly Item[],
  run: (item: Item) => Promise<Out>
): Promise<Out[]> => {
  if (items.length === 0) {
    return [];
  }

  const [item, ...rest] = items as readonly [Item, ...Item[]];
  const head = await run(item);

  return [head, ...(await mapInOrder(rest, run))];
};

const toPageStem = (frame: ExportFrame): string => {
  if (frame.path) {
    return `-${exportFileStem(frame.path)}`;
  }

  return "";
};

const toScaleTag = (scale: number): string => {
  if (scale > 1) {
    return `@${scale}x`;
  }

  return "";
};

const toShotName = (shot: Shot, index: number, scale: number): string =>
  `${index + 1}-${exportFileStem(shot.frame.name).toLowerCase()}${toPageStem(shot.frame)}${toScaleTag(scale)}.png`;

const toMissingNote = (count: number): string | null => {
  if (count === 0) {
    return null;
  }

  if (count === 1) {
    return "1 file could not be inlined";
  }

  return `${count} files could not be inlined`;
};

const toHtmlEntryName = (frame: ExportFrame): string => {
  if (frame.path) {
    return `${exportFileStem(frame.path)}.html`;
  }

  return "index.html";
};

const inlinePages = async (
  job: ImageJob,
  kind: ProjectKind
): Promise<InlinedPage[]> => {
  const { inlineHtml } = await import("./inline-html.js");

  const pages = [
    ...new Map(job.frames.map((frame) => [frame.path ?? "", frame])).values(),
  ];

  return mapInOrder(pages, async (frame) => {
    const inlined = await inlineHtml(
      job.runtime.preview,
      job.url,
      frame,
      kind,
      job.runtime.secrets
    );

    return { frame, html: inlined.html, missing: inlined.missing };
  });
};

const exportHtml = async (
  job: ImageJob,
  kind: ProjectKind
): Promise<ExportedBytes> => {
  const [{ zipFiles }, results] = await Promise.all([
    import("../design-system/zip.js"),
    inlinePages(job, kind),
  ]);

  const missing = new Set(results.flatMap((result) => result.missing));
  const note = toMissingNote(missing.size);
  const [only] = results;

  if (results.length === 1 && only) {
    return toBytes(
      Buffer.from(only.html),
      "text/html; charset=utf-8",
      `${job.stem}${toPageStem(only.frame)}.html`,
      note
    );
  }

  const entries: ZipEntry[] = results.map((result) => ({
    data: Buffer.from(result.html),
    name: toHtmlEntryName(result.frame),
  }));

  return toBytes(zipFiles(entries), ZIP, `${job.stem}-html.zip`, note);
};

const captureAll = async (
  job: ImageJob,
  scale: ExportScale
): Promise<Shot[]> => {
  const { captureFrame } = await import("../preview/index.js");

  return mapInOrder(job.frames, (frame) =>
    captureFrame(
      job.runtime.preview,
      job.url,
      frame,
      scale,
      job.scope,
      job.selector ?? ""
    )
  );
};

const toCropNote = (shots: readonly Shot[]): string | null => {
  if (shots.some((shot) => shot.cropped)) {
    return "Very tall pages were cut at the bottom";
  }

  return null;
};

const exportPdf = async (job: ImageJob): Promise<ExportedBytes> => {
  const [{ imagesToPdf }, shots] = await Promise.all([
    import("./pdf.js"),
    captureAll(job, PDF_SCALE),
  ]);

  const pages = shots.map((shot) => ({
    cssHeight: shot.cssHeight,
    cssWidth: shot.cssWidth,
    png: shot.png,
  }));

  return toBytes(
    imagesToPdf(pages, job.name),
    "application/pdf",
    `${job.stem}.pdf`,
    toCropNote(shots)
  );
};

const exportPng = async (job: ImageJob): Promise<ExportedBytes> => {
  const [{ zipFiles }, shots] = await Promise.all([
    import("../design-system/zip.js"),
    captureAll(job, job.scale),
  ]);

  const note = toCropNote(shots);
  const [first] = shots;

  if (shots.length === 1 && first) {
    return toBytes(
      first.png,
      "image/png",
      `${job.stem}${toScaleTag(job.scale)}.png`,
      note
    );
  }

  const entries = shots.map((shot, index) => ({
    data: shot.png,
    name: toShotName(shot, index, job.scale),
  }));

  return toBytes(zipFiles(entries), ZIP, `${job.stem}-png.zip`, note);
};

const exportVectorFile = async (
  job: ImageJob,
  format: "pptx" | "svg"
): Promise<ExportedBytes> => {
  const { exportVector } = await import("./vector-export.js");

  const request: VectorRequest = {
    format,
    frames: job.frames,
    name: job.name,
    scope: job.scope,
    stem: job.stem,
  };

  if (job.selector !== null) {
    request.selector = job.selector;
  }

  const out = await exportVector(job.runtime.preview, job.url, request);

  return toBytes(out.bytes, out.type, out.name, out.note ?? null);
};

const exportOpened = (
  job: ImageJob,
  format: FileFormat,
  kind: ProjectKind
): Promise<ExportedBytes> => {
  if (format === "html") {
    return exportHtml(job, kind);
  }

  if (format === "svg" || format === "pptx") {
    return exportVectorFile(job, format);
  }

  if (format === "pdf") {
    return exportPdf(job);
  }

  return exportPng(job);
};

const toScope = (scope: ExportScope | null): ExportScope => {
  if (scope === "frame") {
    return "frame";
  }

  return "page";
};

const releaseQuietly = async (release: () => Promise<void>): Promise<void> => {
  await Promise.allSettled([release()]);
};

const buildExportFile = async (
  exportRuntime: ExportRuntime,
  request: FileRequest
): Promise<ExportedBytes> => {
  const source = await resolveSource(
    exportRuntime,
    request.projectId,
    request.versionId
  );

  const tag = source.version.id.slice(0, VERSION_TAG);
  const fileStem = `${exportFileStem(source.project.name)}-${tag}`;

  if (request.format === "zip") {
    const zip = await exportRuntime.versions.exportZip(
      source.project,
      source.version.id
    );

    return toBytes(zip, ZIP, `${fileStem}.zip`, null);
  }

  const opened = await source.open();

  const job: ImageJob = {
    frames: parseFrames(request.frames ?? []),
    name: source.project.name,
    runtime: exportRuntime,
    scale: parseScale(request.scale ?? 1),
    scope: toScope(request.scope),
    selector: request.selector,
    stem: fileStem,
    url: opened.url,
  };

  try {
    return await exportOpened(job, request.format, source.project.kind);
  } finally {
    await releaseQuietly(() => opened.release());
  }
};

export { buildExportFile };

export type { ExportedBytes, FileFormat, FileRequest };
