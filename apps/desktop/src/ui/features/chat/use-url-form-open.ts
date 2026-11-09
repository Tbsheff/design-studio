import { useState } from "react";

interface UrlFormOpen {
  readonly close: () => void;
  readonly isOpen: boolean;
  readonly open: () => void;
}

const useUrlFormOpen = (): UrlFormOpen => {
  const [isOpen, setIsOpen] = useState(false);

  const close = (): void => setIsOpen(false);
  const open = (): void => setIsOpen(true);

  return { close, isOpen, open };
};

export { useUrlFormOpen };

export type { UrlFormOpen };
