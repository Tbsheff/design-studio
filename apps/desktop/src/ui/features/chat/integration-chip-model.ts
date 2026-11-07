interface ActiveItem {
  readonly isEnabled: boolean;
  readonly name: string;
}

const toActiveNames = (items: readonly ActiveItem[]): string[] =>
  items.flatMap((item) => {
    if (item.isEnabled) {
      return [item.name];
    }

    return [];
  });

export { toActiveNames };
