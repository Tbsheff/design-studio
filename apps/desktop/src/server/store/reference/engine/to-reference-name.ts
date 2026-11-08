import { slugify } from "@design-studio/contracts/folders";

const FALLBACK_NAME = "reference";

const toStem = (fileName: string): string => {
  const dot = fileName.lastIndexOf(".");

  if (dot <= 0) {
    return fileName;
  }

  return fileName.slice(0, dot);
};

const toReferenceName = (requested: string | null, source: string): string => {
  const slug = slugify(requested ?? toStem(source));

  if (slug === "untitled") {
    return FALLBACK_NAME;
  }

  return slug;
};

export { toReferenceName };
