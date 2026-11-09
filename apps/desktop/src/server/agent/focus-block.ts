const toFocusLines = (paths: readonly string[] | undefined): string[] => {
  if (!paths || paths.length === 0) {
    return [];
  }

  return [
    `Focus files: ${paths.join(", ")}. The user limited this run to these files. Change only them. Writes to any other file are blocked and undone.`,
  ];
};

export { toFocusLines };
