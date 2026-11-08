const isMenuItem = (node: Node | null): node is HTMLButtonElement =>
  node instanceof HTMLButtonElement &&
  !node.disabled &&
  node.getAttribute("role")?.startsWith("menuitem") === true;

const toMenuItems = (root: HTMLElement): HTMLButtonElement[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const items: HTMLButtonElement[] = [];

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (isMenuItem(node)) {
      items.push(node);
    }
  }

  return items;
};

export { toMenuItems };
