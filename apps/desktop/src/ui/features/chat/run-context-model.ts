const ROOT_PAGES: ReadonlySet<string> = new Set([
  "",
  "/",
  "index.html",
  "/index.html",
]);

const isRootPage = (page: string): boolean => ROOT_PAGES.has(page);

export { isRootPage };
