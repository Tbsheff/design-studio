const FLOW_BASE = "https://flow.local/";

const QUOTED_PAGE = /["'](?<href>[^"'\s<>]+?\.html?)(?:[?#][^"']*)?["']/giu;

const OUTSIDE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu;

const toFlowPath = (href: string, from: string): string | null => {
  if (OUTSIDE.test(href)) {
    return null;
  }

  const url = URL.parse(href, `${FLOW_BASE}${from}`);

  if (url === null || url.origin !== new URL(FLOW_BASE).origin) {
    return null;
  }

  return decodeURIComponent(url.pathname.replace(/^\/+/u, ""));
};

const toFlowLinks = (file: string, html: string): readonly string[] => {
  const found = new Set<string>();

  for (const match of html.matchAll(QUOTED_PAGE)) {
    const href = match.groups?.["href"] ?? "";
    const page = toFlowPath(href, file);

    if (page !== null && page !== "" && page !== file) {
      found.add(page);
    }
  }

  return [...found];
};

export { toFlowLinks, toFlowPath };
