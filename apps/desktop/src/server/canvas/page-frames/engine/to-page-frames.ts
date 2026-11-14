interface PageGraph {
  readonly allowed: ReadonlySet<string> | null;
  readonly framed: readonly string[];
  readonly links: ReadonlyMap<string, readonly string[]>;
  readonly roots: readonly string[];
}

interface PageFramePlan {
  readonly from: string;
  readonly page: string;
}

interface PageText {
  readonly html: string;
  readonly page: string;
}

const SPACE = /\s+/gu;

const TITLE_SEPARATORS = [" | ", " · ", " — ", " – ", " - "];

const PAGE_FILE = /\.html?$/iu;

const LABEL_MAX = 60;

const ENTITIES: ReadonlyMap<string, string> = new Map([
  ["&amp;", "&"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&#39;", "'"],
  ["&apos;", "'"],
  ["&nbsp;", " "],
]);

const isAllowed = (graph: PageGraph, page: string): boolean =>
  graph.allowed === null || graph.allowed.has(page);

const toPageFramePlan = (graph: PageGraph): PageFramePlan[] => {
  const seen = new Set(graph.framed);
  const queue = [...graph.roots];
  const plan: PageFramePlan[] = [];

  for (const from of queue) {
    for (const page of graph.links.get(from) ?? []) {
      if (!seen.has(page) && isAllowed(graph, page)) {
        seen.add(page);
        plan.push({ from, page });
        queue.push(page);
      }
    }
  }

  return plan;
};

const toTaglessPart = (part: string): string => {
  const end = part.indexOf(">");

  if (end === -1) {
    return part;
  }

  return part.slice(end + 1);
};

const toTagless = (html: string): string => {
  const [first = "", ...rest] = html.split("<");

  return [first, ...rest.map((part) => toTaglessPart(part))].join(" ");
};

const toPlainText = (html: string): string => {
  let text = toTagless(html);

  for (const [entity, value] of ENTITIES) {
    text = text.replaceAll(entity, value);
  }

  return text.replaceAll(SPACE, " ").trim().slice(0, LABEL_MAX).trim();
};

const toInnerHtml = (html: string, tag: string): string => {
  const lower = html.toLowerCase();
  const open = lower.indexOf(`<${tag}`);
  const start = lower.indexOf(">", open) + 1;
  const end = lower.indexOf(`</${tag}>`, start);

  if (open === -1 || start === 0 || end === -1) {
    return "";
  }

  return html.slice(start, end);
};

const toTitleHead = (html: string): string => {
  let head = toPlainText(toInnerHtml(html, "title"));

  for (const separator of TITLE_SEPARATORS) {
    head = head.split(separator)[0] ?? head;
  }

  return head.trim();
};

const toHeading = (html: string): string =>
  toPlainText(toInnerHtml(html, "h1"));

const toPageStem = (page: string): string => {
  const name = page.split("/").pop() ?? page;
  const stem = name.replace(PAGE_FILE, "").replaceAll(/[-_]+/gu, " ").trim();

  if (stem === "") {
    return page;
  }

  return `${stem.charAt(0).toUpperCase()}${stem.slice(1)}`;
};

const toPageLabels = (
  texts: readonly PageText[]
): ReadonlyMap<string, string> => {
  const heads = texts.map((text) => toTitleHead(text.html));
  const labels = new Map<string, string>();

  for (const [index, text] of texts.entries()) {
    const head = heads[index] ?? "";
    const isShared = heads.filter((other) => other === head).length > 1;
    let label = head;

    if (head === "" || isShared) {
      label = toHeading(text.html) || toPageStem(text.page);
    }

    labels.set(text.page, label);
  }

  return labels;
};

export { toPageFramePlan, toPageLabels, toPageStem };

export type { PageFramePlan, PageGraph, PageText };
