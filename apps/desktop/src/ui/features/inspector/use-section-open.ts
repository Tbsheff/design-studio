import { useCallback, useState } from "react";

import { readStored, writeStored } from "../../platform/storage.js";

const OPEN_KEY = "studio.inspector.sections";

const isOpenMap = (raw: unknown): raw is Record<string, boolean> =>
  Boolean(raw) && typeof raw === "object";

const getOpenMap = (): Record<string, boolean> => {
  try {
    const raw: unknown = JSON.parse(readStored(OPEN_KEY) ?? "{}");

    if (isOpenMap(raw)) {
      return raw;
    }

    return {};
  } catch {
    return {};
  }
};

const sectionOpen = getOpenMap();

const useSectionOpen = (
  title: string,
  initial: boolean
): [boolean, () => void] => {
  const [open, setOpen] = useState(() => sectionOpen[title] ?? initial);

  const toggle = useCallback((): void => {
    const next = !open;
    sectionOpen[title] = next;
    setOpen(next);
    writeStored(OPEN_KEY, JSON.stringify(sectionOpen));
  }, [open, title]);

  return [open, toggle];
};

export { useSectionOpen };
