const findElement = (root: Node, selector: string): HTMLElement | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();

  while (node) {
    if (node instanceof HTMLElement && node.matches(selector)) {
      return node;
    }

    node = walker.nextNode();
  }

  return null;
};

export { findElement };
