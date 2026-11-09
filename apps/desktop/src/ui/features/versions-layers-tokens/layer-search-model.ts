import type { LayerNode } from "@design-studio/contracts";

interface LayerSearchResult {
  readonly dimmed: ReadonlySet<number>;
  readonly matches: readonly number[];
  readonly rows: LayerNode[];
}

const toSearchTerms = (query: string): string[] =>
  query
    .toLowerCase()
    .split(/\s+/u)
    .filter((term) => term.length > 0);

const toNodeHaystack = (node: LayerNode): string =>
  [node.tag, node.name, node.text].join(" ").toLowerCase();

const isNodeMatch = (node: LayerNode, terms: readonly string[]): boolean => {
  const haystack = toNodeHaystack(node);

  return terms.every((term) => haystack.includes(term));
};

const toLayerSearch = (
  nodes: LayerNode[],
  query: string
): LayerSearchResult | null => {
  const terms = toSearchTerms(query);

  if (terms.length === 0) {
    return null;
  }

  const included = new Set<number>();
  const matches: number[] = [];
  const ancestors: number[] = [];

  for (const node of nodes) {
    ancestors.length = Math.min(ancestors.length, node.depth);

    if (isNodeMatch(node, terms)) {
      matches.push(node.id);

      for (const id of ancestors) {
        included.add(id);
      }

      included.add(node.id);
    }

    ancestors[node.depth] = node.id;
  }

  const matched = new Set(matches);
  const dimmed = new Set<number>();

  for (const id of included) {
    if (!matched.has(id)) {
      dimmed.add(id);
    }
  }

  const rows = nodes.filter((node) => included.has(node.id));

  return { dimmed, matches, rows };
};

const toNextMatch = (count: number, current: number, delta: 1 | -1): number => {
  if (count === 0) {
    return 0;
  }

  return (current + delta + count) % count;
};

export { toLayerSearch, toNextMatch };

export type { LayerSearchResult };
