import { IMAGE_TYPES, MAX_IMAGES } from "../../domain/image-limits.js";

interface ImageDraft {
  readonly id: string;
  readonly file: File;
  readonly url: string;
}

interface ReferenceDraft {
  readonly url: string;
  readonly host: string;
}

const ID_RADIX = 36;
const ID_START = 2;
const ID_END = 8;

const getSoleUrl = (text: string): ReferenceDraft | null => {
  const trimmed = text.trim();

  if (!/^https?:\/\/\S+$/iu.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    return { host: url.host.replace(/^www\./u, ""), url: url.href };
  } catch {
    return null;
  }
};

const listImageFiles = (list: Iterable<File> | null): File[] =>
  [...(list ?? [])].filter((file) => IMAGE_TYPES.has(file.type));

type ImageChange =
  | {
      readonly kind: "add";
      readonly files: File[];
      readonly onFull: () => void;
    }
  | { readonly kind: "remove"; readonly id: string }
  | { readonly kind: "clear" };

const toChangedImages = (
  current: ImageDraft[],
  change: ImageChange
): ImageDraft[] => {
  if (change.kind === "add") {
    const room = Math.max(0, MAX_IMAGES - current.length);

    if (change.files.length > room) {
      change.onFull();
    }

    const added: ImageDraft[] = [];

    for (const file of change.files.slice(0, room)) {
      const objectUrl = URL.createObjectURL(file);
      const suffix = Math.random().toString(ID_RADIX).slice(ID_START, ID_END);
      added.push({
        file,
        id: `${file.name}-${file.size}-${suffix}`,
        url: objectUrl,
      });
    }

    return [...current, ...added];
  }

  const kept: ImageDraft[] = [];

  for (const image of current) {
    if (change.kind === "clear" || image.id === change.id) {
      URL.revokeObjectURL(image.url);
    } else {
      kept.push(image);
    }
  }

  return kept;
};

export { getSoleUrl, listImageFiles, toChangedImages };

export type { ImageDraft, ReferenceDraft };
