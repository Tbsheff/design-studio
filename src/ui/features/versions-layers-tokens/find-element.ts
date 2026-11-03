const findElements = (root: Node, selector: string): HTMLElement[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const found: HTMLElement[] = [];
  let node = walker.nextNode();

  while (node) {
    if (node instanceof HTMLElement && node.matches(selector)) {
      found.push(node);
    }

    node = walker.nextNode();
  }

  return found;
};

const findElement = (root: Node, selector: string): HTMLElement | null =>
  findElements(root, selector)[0] ?? null;

export { findElement, findElements };
