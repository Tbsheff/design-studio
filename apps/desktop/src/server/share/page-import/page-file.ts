import { access } from "node:fs/promises";
import path from "node:path";

import { PAGE_IMPORT_NAME_MAX } from "./deps.js";

const MAX_TRIES = 50;

const NOT_SLUG = /[^a-z0-9]/u;

const toTidy = (text: string, separator: RegExp | string): string =>
  text
    .split(separator)
    .filter((part) => part !== "")
    .join("-");

const toSlugOf = (raw: string): string => {
  const words = toTidy(raw.toLowerCase().normalize("NFKD"), NOT_SLUG);
  const slug = toTidy(words.slice(0, PAGE_IMPORT_NAME_MAX), "-");

  return slug || "imported-page";
};

const toExists = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
};

const isTaken = async (workTree: string, slug: string): Promise<boolean> => {
  const [page, folder] = await Promise.all([
    toExists(path.join(workTree, `${slug}.html`)),
    toExists(path.join(workTree, "assets", slug)),
  ]);

  return page || folder;
};

const toFreeSlug = async (
  workTree: string,
  wanted: string
): Promise<string> => {
  const base = toSlugOf(wanted);

  const names = [
    base,
    ...Array.from(
      { length: MAX_TRIES },
      (_slot, index) => `${base}-${index + 2}`
    ),
  ];

  const taken = await Promise.all(names.map((name) => isTaken(workTree, name)));
  const free = names.find((_name, index) => !taken[index]);

  return free ?? `${base}-${Date.now()}`;
};

const toNameFor = (name: string | null, title: string, url: string): string => {
  if (name) {
    return name;
  }

  if (title.trim()) {
    return title;
  }

  return new URL(url).hostname;
};

export { toFreeSlug as freeSlug, toNameFor as nameFor };
