import type { EditorInfo } from "@design-studio/contracts/export";
import { useEffect, useState } from "react";

import { exportApi } from "./export-api.js";
import { settleValue } from "./settle.js";

const useEditors = (active: boolean): EditorInfo[] => {
  const [editors, setEditors] = useState<EditorInfo[]>([]);
  useEffect(() => {
    if (!active || editors.length > 0) {
      return;
    }

    let live = true;
    void settleValue(exportApi.editors(), (list) => {
      if (live) {
        setEditors(list);
      }
    });

    return (): void => {
      live = false;
    };
  }, [active, editors.length]);

  return editors;
};

export { useEditors };
