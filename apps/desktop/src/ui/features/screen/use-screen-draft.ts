import { useCallback, useState } from "react";
import type { ChangeEvent } from "react";

import type { ScreenLayoutId } from "./screen-model.js";

interface ScreenDraft {
  readonly group: string | null;
  readonly handleGroup: (name: string) => void;
  readonly handleLayout: (layout: ScreenLayoutId) => void;
  readonly handlePath: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleTitle: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly layout: ScreenLayoutId;
  readonly path: string;
  readonly title: string;
}

const useScreenDraft = (initialPath: string): ScreenDraft => {
  const [path, setPath] = useState(initialPath);
  const [group, setGroup] = useState<string | null>(null);
  const [layout, setLayout] = useState<ScreenLayoutId>("blank");
  const [title, setTitle] = useState("");

  const handlePath = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setPath(event.target.value),
    []
  );

  const handleTitle = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      setTitle(event.target.value),
    []
  );

  const handleGroup = useCallback((name: string): void => setGroup(name), []);

  const handleLayout = useCallback(
    (next: ScreenLayoutId): void => setLayout(next),
    []
  );

  return {
    group,
    handleGroup,
    handleLayout,
    handlePath,
    handleTitle,
    layout,
    path,
    title,
  };
};

export { useScreenDraft };

export type { ScreenDraft };
