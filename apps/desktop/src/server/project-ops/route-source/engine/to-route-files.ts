const LAYOUT_NAMES = ["layout.tsx", "layout.ts", "layout.jsx", "layout.js"];

const toSegments = (file: string): string[] =>
  file.split("/").filter((segment) => segment !== "" && segment !== ".");

const toFolderChain = (routeFile: string, routerDir: string): string[] => {
  const folder = toSegments(routeFile).slice(0, -1);
  const stop = toSegments(routerDir).length;
  const chain: string[] = [];

  for (let size = folder.length; size >= stop; size -= 1) {
    chain.push(folder.slice(0, size).join("/"));
  }

  return chain;
};

const toLayoutCandidates = (routeFile: string, routerDir: string): string[] =>
  toFolderChain(routeFile, routerDir).flatMap((folder) =>
    LAYOUT_NAMES.map((name) => [folder, name].filter(Boolean).join("/"))
  );

export { toLayoutCandidates };
