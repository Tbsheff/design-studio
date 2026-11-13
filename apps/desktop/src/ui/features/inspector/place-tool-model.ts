type PlaceStep = "edit" | "insert" | "retarget";

const TEXT_TAGS: ReadonlySet<string> = new Set([
  "a",
  "b",
  "blockquote",
  "button",
  "caption",
  "cite",
  "code",
  "dd",
  "dt",
  "em",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "label",
  "legend",
  "li",
  "p",
  "q",
  "small",
  "span",
  "strong",
  "summary",
  "td",
  "th",
]);

const ROOT_TAGS: ReadonlySet<string> = new Set(["body", "html"]);

const BODY_SELECTOR =
  "body > main, body > :is(div, section, article, header, footer)";

const toPlaceStep = (kind: "frame" | "text", tag: string): PlaceStep => {
  const name = tag.toLowerCase();

  if (ROOT_TAGS.has(name)) {
    return "retarget";
  }

  if (kind === "text" && TEXT_TAGS.has(name)) {
    return "edit";
  }

  return "insert";
};

export { BODY_SELECTOR, toPlaceStep };

export type { PlaceStep };
