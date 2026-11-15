import { useCallback, useEffect, useRef, useState } from "react";

import type { DirectEdit } from "./deps.js";
import type { FontRow } from "./font-list-model.js";

interface FontPreview {
  readonly failed: ReadonlySet<string>;
  readonly show: (row: FontRow | null) => void;
}

const NO_FAILED: ReadonlySet<string> = new Set();

const toCatalogFamily = (row: FontRow | null): string | null => {
  if (row === null || row.source !== "catalog") {
    return null;
  }

  return row.family;
};

const toFailed = (
  failed: ReadonlySet<string>,
  family: string,
  isLoaded: boolean
): ReadonlySet<string> => {
  const next = new Set(failed);

  if (isLoaded) {
    next.delete(family);
  } else {
    next.add(family);
  }

  return next;
};

const setFontPreview = (
  port: DirectEdit["port"],
  family: string | null
): void => {
  port.current?.post({ family, type: "font-preview" });
};

const useFontPreview = (edit: DirectEdit, isOpen: boolean): FontPreview => {
  const [failed, setFailed] = useState<ReadonlySet<string>>(NO_FAILED);
  const shown = useRef<string | null>(null);
  const { port } = edit;

  useEffect(() => {
    const listen = port.current?.listen ?? null;

    if (!isOpen || listen === null) {
      return;
    }

    return listen((message) => {
      if (message.type === "font-status") {
        setFailed((last) => toFailed(last, message.family, message.isLoaded));
      }
    });
  }, [isOpen, port]);

  const show = useCallback(
    (row: FontRow | null): void => {
      const family = toCatalogFamily(row);

      if (family === null && shown.current === null) {
        return;
      }

      shown.current = family;
      setFontPreview(port, family);
    },
    [port]
  );

  return { failed, show };
};

export { useFontPreview };

export type { FontPreview };
