interface ToolCatalog {
  readonly blockedTools: ReadonlySet<string>;
  readonly studioTools: readonly string[];
}

let current: ToolCatalog = { blockedTools: new Set(), studioTools: [] };

const setToolCatalog = (catalog: ToolCatalog): void => {
  current = catalog;
};

const toolCatalog = (): ToolCatalog => current;

export { setToolCatalog, toolCatalog };

export type { ToolCatalog };
