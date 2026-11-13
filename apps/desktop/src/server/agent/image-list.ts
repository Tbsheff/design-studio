import { readFile } from "node:fs/promises";

import type { Attachment } from "@design-studio/contracts";
import type { ImageSize } from "@design-studio/contracts/image-frame";

import { plainAttachmentName } from "../../shared/reference.js";
import { toImageSize } from "../canvas/frame-import/index.js";

interface ListedImage {
  readonly id: string;
  readonly name: string;
  readonly size: ImageSize | null;
}

const LISTED_MIMES: ReadonlySet<string> = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const NAME_MAX = 80;

const IMPORT_HINT =
  "Only when the user asks for a new screen or page from an image: call mcp__studio__import_frame_canvas with that image id as attachmentId and shouldStartRun false. It adds the page and a frame in the image shape. Then build the page it returns from the image in this run.";

const toFileImageSize = async (file: string): Promise<ImageSize | null> => {
  try {
    const found = toImageSize(new Uint8Array(await readFile(file)));

    if (found.ok) {
      return found.value;
    }

    return null;
  } catch {
    return null;
  }
};

const toListedImage = async (attachment: Attachment): Promise<ListedImage> => ({
  id: attachment.id,
  name: plainAttachmentName(attachment.name).slice(0, NAME_MAX),
  size: await toFileImageSize(attachment.path),
});

const toSizeText = (size: ImageSize | null): string => {
  if (size === null) {
    return "size unknown";
  }

  return `${size.width}x${size.height}`;
};

const toImageLine = (image: ListedImage, index: number): string =>
  `image ${index + 1}: id ${image.id}, ${toSizeText(image.size)}, ${image.name}`;

const toImageListLines = async (
  attachments: readonly Attachment[]
): Promise<string[]> => {
  const shown = attachments.filter((attachment) =>
    LISTED_MIMES.has(attachment.mime)
  );

  if (shown.length === 0) {
    return [];
  }

  const images = await Promise.all(
    shown.map((attachment) => toListedImage(attachment))
  );

  return [
    [
      "Attached images, in order, with their attachment ids:",
      ...images.map((image, index) => toImageLine(image, index)),
      IMPORT_HINT,
    ].join("\n"),
  ];
};

export { toImageListLines };
