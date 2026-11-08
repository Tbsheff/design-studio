import type { Icon } from "@design-studio/ui";

import { COPY } from "./copy.js";
import {
  IMAGE_TYPES,
  MAX_IMAGES,
  MAX_URLS,
} from "./new-design-system-values.js";
import type { DraftForm, Mode, Patch } from "./new-design-system-values.js";

interface DraftRequest {
  basePackId: string;
  brief?: string;
  designMd?: string;
  folderPath?: string;
  mode: Mode;
  name?: string;
  urls: string[];
}

interface RoutedFiles {
  patch: Patch;
  skipped: string[];
}

interface SourceItem {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
}

type FileKind = "image" | "markdown" | "other" | "tokens";

const MODES: { label: string; value: Mode }[] = [
  { label: COPY.textDetect, value: "auto" },
  { label: COPY.textLight, value: "light" },
  { label: COPY.textDark, value: "dark" },
];

const toMode = (value: string): Mode => {
  const found = MODES.find((mode) => mode.value === value);

  return found?.value ?? "auto";
};

const toUrlLabel = (url: string): string =>
  url.replace(/^https?:\/\//u, "").replace(/\/$/u, "");

const toUrlList = (form: DraftForm): string[] => {
  const typed = form.urlInput.trim();
  const list: string[] = [];

  for (const url of form.urls) {
    const trimmed = url.trim();

    if (trimmed) {
      list.push(trimmed);
    }
  }

  if (typed && !list.includes(typed)) {
    return [...list, typed].slice(0, MAX_URLS);
  }

  return list;
};

const isFilled = (text: string): boolean => text.trim() !== "";

const hasTextSource = (form: DraftForm): boolean =>
  isFilled(form.designMd) || isFilled(form.brief) || isFilled(form.folder);

const hasSource = (form: DraftForm): boolean =>
  toUrlList(form).length > 0 ||
  hasTextSource(form) ||
  form.tokensFile !== null ||
  form.images.length > 0;

const toDraftRequest = (form: DraftForm): DraftRequest => {
  const request: DraftRequest = {
    basePackId: form.basePackId,
    mode: form.mode,
    urls: toUrlList(form),
  };

  if (isFilled(form.brief)) {
    request.brief = form.brief;
  }

  if (isFilled(form.designMd)) {
    request.designMd = form.designMd;
  }

  if (isFilled(form.folder)) {
    request.folderPath = form.folder.trim();
  }

  if (isFilled(form.name)) {
    request.name = form.name.trim();
  }

  return request;
};

const toFormData = (form: DraftForm): FormData => {
  const data = new FormData();
  data.append("request", JSON.stringify(toDraftRequest(form)));

  if (form.tokensFile) {
    data.append("tokensFile", form.tokensFile, form.tokensFile.name);
  }

  for (const image of form.images) {
    data.append("images", image, image.name);
  }

  return data;
};

const toFileKind = (file: File): FileKind => {
  const lower = file.name.toLowerCase();

  if (IMAGE_TYPES.includes(file.type)) {
    return "image";
  }

  if (/\.(?:json|css)$/u.test(lower)) {
    return "tokens";
  }

  if (/\.(?:md|markdown)$/u.test(lower)) {
    return "markdown";
  }

  return "other";
};

const routeFiles = async (
  files: File[],
  form: DraftForm
): Promise<RoutedFiles> => {
  const patch: Patch = {};
  const skipped: string[] = [];
  const images = [...form.images];
  let markdown: File | null = null;

  for (const file of files) {
    const kind = toFileKind(file);

    if (kind === "image" && images.length < MAX_IMAGES) {
      images.push(file);
    } else if (kind === "image") {
      skipped.push(
        `${file.name} ${COPY.textAtMost}${MAX_IMAGES}${COPY.textImagesClose}`
      );
    } else if (kind === "tokens") {
      patch.tokensFile = file;
    } else if (kind === "markdown") {
      markdown = file;
    } else {
      skipped.push(file.name);
    }
  }

  if (markdown) {
    patch.designMd = await markdown.text();
    patch.designMdFile = markdown.name;
  }

  if (images.length !== form.images.length) {
    patch.images = images;
  }

  return { patch, skipped };
};

const toImagesLabel = (count: number): string => {
  if (count === 1) {
    return COPY.textOneImageForAi;
  }

  return `${count} ${COPY.textImagesForAi}`;
};

const toFolderLabel = (folder: string): string =>
  folder.trim().split("/").findLast(Boolean) ?? folder.trim();

const toSourceList = (form: DraftForm): SourceItem[] => {
  const list: SourceItem[] = toUrlList(form).map((url) => ({
    icon: "globe",
    label: toUrlLabel(url),
  }));

  if (isFilled(form.designMd)) {
    list.push({ icon: "doc", label: form.designMdFile ?? COPY.labelDesignMd });
  }

  if (isFilled(form.brief)) {
    list.push({ icon: "pencil", label: COPY.labelBrief });
  }

  if (form.tokensFile) {
    list.push({ icon: "token", label: form.tokensFile.name });
  }

  if (isFilled(form.folder)) {
    list.push({ icon: "folder", label: toFolderLabel(form.folder) });
  }

  if (form.images.length > 0) {
    list.push({ icon: "image", label: toImagesLabel(form.images.length) });
  }

  return list;
};

const toSkippedNote = (skipped: string[]): string | null => {
  if (skipped.length === 0) {
    return null;
  }

  return `${COPY.textNotAdded}${skipped.join(", ")}${COPY.textNotAddedHelp}`;
};

export {
  hasSource,
  MODES,
  toMode,
  routeFiles,
  toFormData,
  toSkippedNote,
  toSourceList,
  toUrlLabel,
  toUrlList,
};
