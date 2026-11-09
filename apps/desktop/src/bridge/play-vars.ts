import { holdsWhen } from "@design-studio/contracts/link-variable";
import type { VariableMemory } from "@design-studio/contracts/link-variable";
import type { LinkQuery } from "@design-studio/contracts/links";

let memory: VariableMemory = new Map();

const setPlayVars = (
  entries: readonly (readonly [string, string | number])[]
): void => {
  memory = new Map(entries);
};

const isQueryOpen = (query: LinkQuery): boolean =>
  holdsWhen(query.when ?? null, memory);

const toOpenQueries = (queries: readonly LinkQuery[]): LinkQuery[] =>
  queries.filter((query) => isQueryOpen(query));

const toSameSource = (
  queries: readonly LinkQuery[],
  query: LinkQuery
): LinkQuery[] =>
  toOpenQueries(queries).filter(
    (item) =>
      item.selector === query.selector &&
      (item.text ?? "") === (query.text ?? "")
  );

export { isQueryOpen, setPlayVars, toOpenQueries, toSameSource };
