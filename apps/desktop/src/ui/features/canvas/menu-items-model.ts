const toRoleButtons = (
  root: HTMLElement,
  isRole: (role: string) => boolean
): HTMLButtonElement[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const items: HTMLButtonElement[] = [];

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (
      node instanceof HTMLButtonElement &&
      isRole(node.getAttribute("role") ?? "") &&
      !node.disabled
    ) {
      items.push(node);
    }
  }

  return items;
};

const toMenuItems = (root: HTMLElement): HTMLButtonElement[] =>
  toRoleButtons(root, (role) => role.startsWith("menuitem"));

export { toMenuItems };
