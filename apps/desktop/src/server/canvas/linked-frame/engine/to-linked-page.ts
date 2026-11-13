const LT = "<";

const GT = ">";

const HEAD_BLOCK = /<head\b[^>]*>[\s\S]*?<\/head>/iu;

const HTML_OPEN = /<html\b[^>]*>/iu;

const TITLE_BLOCK = /<title\b[^>]*>[\s\S]*?<\/title>/iu;

const HEAD_CLOSE = /<\/head>/iu;

const NOT_SLUG = /[^a-z0-9]/u;

const PAGE_FILE = /\.html?$/iu;

const SLUG_MAX = 40;

const FREE_TRIES = 50;

const DEFAULT_SLUG = "screen";

const toTag = (inner: string): string => `${LT}${inner}${GT}`;

const toEscapedText = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll(LT, "&lt;")
    .replaceAll(GT, "&gt;")
    .replaceAll('"', "&quot;");

const toDefaultHead = (): string =>
  [toTag("head"), `  ${toTag('meta charset="utf-8"')}`, toTag("/head")].join(
    "\n"
  );

const toHeadWithTitle = (head: string, title: string): string => {
  const titleTag = `${toTag("title")}${toEscapedText(title)}${toTag("/title")}`;

  if (TITLE_BLOCK.test(head)) {
    return head.replace(TITLE_BLOCK, titleTag);
  }

  return head.replace(HEAD_CLOSE, `  ${titleTag}\n${toTag("/head")}`);
};

const toLinkedPage = (source: string, title: string): string => {
  const head = HEAD_BLOCK.exec(source)?.[0] ?? toDefaultHead();
  const htmlOpen = HTML_OPEN.exec(source)?.[0] ?? toTag('html lang="en"');
  const heading = toEscapedText(title);

  return [
    toTag("!doctype html"),
    htmlOpen,
    toHeadWithTitle(head, title),
    toTag("body data-linked-page"),
    `  ${toTag("main")}`,
    `    ${toTag("h1")}${heading}${toTag("/h1")}`,
    `  ${toTag("/main")}`,
    toTag("/body"),
    toTag("/html"),
    "",
  ].join("\n");
};

const toJoinedParts = (text: string, separator: RegExp | string): string =>
  text
    .split(separator)
    .filter((part) => part !== "")
    .join("-");

const toPageSlug = (label: string): string => {
  const words = toJoinedParts(label.toLowerCase().normalize("NFKD"), NOT_SLUG);
  const slug = toJoinedParts(words.slice(0, SLUG_MAX), "-");

  if (slug === "") {
    return DEFAULT_SLUG;
  }

  return slug;
};

const toPagePath = (raw: string): string => {
  const clean = raw.trim().replace(/^\/+/u, "");

  if (PAGE_FILE.test(clean)) {
    return clean;
  }

  return `${toPageSlug(clean)}.html`;
};

const toFreePagePath = (
  slug: string,
  taken: ReadonlySet<string>
): string | null => {
  const names = [
    `${slug}.html`,
    ...Array.from(
      { length: FREE_TRIES },
      (_slot, index) => `${slug}-${index + 2}.html`
    ),
  ];

  return names.find((name) => !taken.has(name)) ?? null;
};

const isSafePagePath = (pagePath: string): boolean =>
  pagePath !== "" &&
  !pagePath.split("/").includes("..") &&
  !pagePath.startsWith(".") &&
  PAGE_FILE.test(pagePath);

export { isSafePagePath, toFreePagePath, toLinkedPage, toPagePath, toPageSlug };
