import { slugify } from "@design-studio/contracts/folders";

const MAX_WORDS = 3;

const MAX_ANSWER_CHARS = 80;

const toFolderSlug = (answer: string): string | null => {
  const firstLine = answer.trim().split("\n")[0] ?? "";
  const slug = slugify(firstLine.slice(0, MAX_ANSWER_CHARS));

  if (slug === "untitled") {
    return null;
  }

  const words = slug.split("-").slice(0, MAX_WORDS);

  return words.join("-");
};

export { toFolderSlug };
