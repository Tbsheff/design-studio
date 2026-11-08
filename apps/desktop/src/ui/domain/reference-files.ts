import { IMAGE_TYPES } from "./image-limits.js";

const REFERENCE_ACCEPT = ".zip,.pdf,.md,.markdown,.csv,.json,.txt";

const REFERENCE_EXTENSIONS: ReadonlySet<string> = new Set([
  "csv",
  "json",
  "markdown",
  "md",
  "pdf",
  "txt",
  "zip",
]);

const MAX_REFERENCE_MEGABYTES = 40;

const BYTES_PER_MEGABYTE = 1_048_576;

const MAX_REFERENCE_BYTES = MAX_REFERENCE_MEGABYTES * BYTES_PER_MEGABYTE;

interface DroppedFiles {
  readonly images: File[];
  readonly others: File[];
  readonly references: File[];
}

const toExtension = (name: string): string => {
  const dot = name.lastIndexOf(".");

  if (dot < 0) {
    return "";
  }

  return name.slice(dot + 1).toLowerCase();
};

const isReferenceFile = (file: File): boolean =>
  REFERENCE_EXTENSIONS.has(toExtension(file.name));

const getReferenceProblem = (file: File): string | null => {
  if (!isReferenceFile(file)) {
    return `${file.name} is not a zip, PDF, Markdown, CSV, JSON or text file.`;
  }

  if (file.size > MAX_REFERENCE_BYTES) {
    return `${file.name} is larger than ${MAX_REFERENCE_MEGABYTES} MB. Attach a smaller file.`;
  }

  return null;
};

const toDroppedFiles = (files: Iterable<File>): DroppedFiles => {
  const images: File[] = [];
  const references: File[] = [];
  const others: File[] = [];

  for (const file of files) {
    if (IMAGE_TYPES.has(file.type)) {
      images.push(file);
    } else if (isReferenceFile(file)) {
      references.push(file);
    } else {
      others.push(file);
    }
  }

  return { images, others, references };
};

export {
  REFERENCE_ACCEPT,
  getReferenceProblem,
  isReferenceFile,
  toDroppedFiles,
};

export type { DroppedFiles };
