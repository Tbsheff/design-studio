import type { WireOutput } from "@design-studio/actions/_core/action";
import type { getDraftRun } from "@design-studio/actions/run/get-draft";

type RunDraftWire = WireOutput<typeof getDraftRun>;

interface DraftWrite {
  readonly bytes: number;
  readonly html: string | null;
  readonly path: string;
  readonly toolUseId: string;
}

interface DraftDelta {
  readonly path: string;
  readonly text: string;
  readonly toolUseId: string;
}

interface DraftBuffer {
  readonly path: string;
  readonly text: string;
  readonly toolUseId: string;
}

const KILOBYTE = 1024;

const HTML_FILE = /\.html?$/iu;

const TAG_START = "\u003C";

const RAW_TEXT_TAGS = ["style", "script", "textarea", "title"];

const OPEN_BLOCKS = [
  { close: "--\u003E", open: `${TAG_START}!--` },
  ...RAW_TEXT_TAGS.map((tag) => ({
    close: `${TAG_START}/${tag}\u003E`,
    open: `${TAG_START}${tag}`,
  })),
];

const toPageFile = (path: string | undefined): string => {
  const clean = (path ?? "").split(/[?#]/u)[0]?.replace(/^\/+/u, "") ?? "";

  if (clean === "") {
    return "index.html";
  }

  if (clean.endsWith("/")) {
    return `${clean}index.html`;
  }

  return clean;
};

const encoder = new TextEncoder();

const toByteCount = (text: string): number => encoder.encode(text).length;

const isHtmlPath = (path: string): boolean => HTML_FILE.test(path);

const toNextBuffer = (
  buffer: DraftBuffer | null,
  delta: DraftDelta
): DraftBuffer => {
  if (buffer === null || buffer.toolUseId !== delta.toolUseId) {
    return { path: delta.path, text: delta.text, toolUseId: delta.toolUseId };
  }

  return { ...buffer, text: `${buffer.text}${delta.text}` };
};

const toClosedHtml = (html: string): string => {
  const lower = html.toLowerCase();
  let tail = "";

  for (const block of OPEN_BLOCKS) {
    if (lower.lastIndexOf(block.open) > lower.lastIndexOf(block.close)) {
      tail = `${tail}${block.close}`;
    }
  }

  return `${html}${tail}`;
};

const toDraftWrite = (buffer: DraftBuffer, pagePath: string): DraftWrite => {
  let markup: string | null = null;

  if (isHtmlPath(buffer.path) && buffer.path === pagePath) {
    markup = toClosedHtml(buffer.text);
  }

  return {
    bytes: toByteCount(buffer.text),
    html: markup,
    path: buffer.path,
    toolUseId: buffer.toolUseId,
  };
};

interface LandInput {
  readonly doneToken: string | null;
  readonly frontToken: string;
  readonly isRunDone: boolean;
}

const HEAD_OPEN = /\u003Chead\b[^>]*>/iu;

const isLandedDraft = (input: LandInput): boolean =>
  input.isRunDone ||
  (input.doneToken !== null && input.doneToken !== input.frontToken);

const toBasedHtml = (html: string, href: string | null): string => {
  if (href === null) {
    return html;
  }

  const tag = `${TAG_START}base href="${href.replaceAll('"', "&quot;")}">`;
  const head = HEAD_OPEN.exec(html);

  if (head === null) {
    return `${tag}${html}`;
  }

  const at = head.index + head[0].length;

  return `${html.slice(0, at)}${tag}${html.slice(at)}`;
};

const toEditLayerHtml = (
  draft: RunDraftWire | null,
  pagePath: string,
  href: string | null
): string | null => {
  if (draft === null || draft.html === null || draft.path !== pagePath) {
    return null;
  }

  return toBasedHtml(toClosedHtml(draft.html), href);
};

interface FrameSlot {
  readonly src: string;
  readonly token: string;
}

const toFrontSrc = (
  slots: readonly FrameSlot[],
  frontToken: string | null
): string | null =>
  slots.find((slot) => slot.token === frontToken)?.src ?? null;

const toFileName = (path: string): string => path.split("/").at(-1) ?? path;

const toKilobytes = (bytes: number): string =>
  String(Math.max(1, Math.round(bytes / KILOBYTE)));

export {
  isHtmlPath,
  isLandedDraft,
  toBasedHtml,
  toEditLayerHtml,
  toFrontSrc,
  toClosedHtml,
  toDraftWrite,
  toFileName,
  toKilobytes,
  toNextBuffer,
  toPageFile,
};

export type {
  DraftBuffer,
  DraftDelta,
  DraftWrite,
  FrameSlot,
  LandInput,
  RunDraftWire,
};
