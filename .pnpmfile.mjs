const COMPILER_API = "npm:typescript@6.0.3";

const readPackage = (manifest) => {
  const peers = manifest.peerDependencies ?? {};

  if (!Object.hasOwn(peers, "typescript")) {
    return manifest;
  }

  const kept = Object.entries(peers).filter(([name]) => name !== "typescript");

  return {
    ...manifest,
    dependencies: { ...manifest.dependencies, typescript: COMPILER_API },
    peerDependencies: Object.fromEntries(kept),
  };
};

const hooks = { readPackage };

export { hooks };
