import { copy } from "./copy.js";

const ROOT_PAGES: ReadonlySet<string> = new Set([
  "",
  "/",
  "index.html",
  "/index.html",
]);

const toPageLabel = (page: string): string => {
  if (ROOT_PAGES.has(page)) {
    return copy.onHomePage;
  }

  return `${copy.onPage}${page}`;
};

export { toPageLabel };
