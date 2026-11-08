const toChipClass = (path: string): string => {
  if (path) {
    return "frame-chip page set";
  }

  return "frame-chip page";
};

const toChipTip = (path: string, isOpen: boolean): string | null => {
  if (isOpen) {
    return null;
  }

  return `/${path} · Show another page in this frame`;
};

export { toChipClass, toChipTip };
