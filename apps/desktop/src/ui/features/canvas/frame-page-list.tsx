import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { menuKeys } from "./frame-menu-model.js";
import { FramePageItem } from "./frame-page-item.js";
import { toValueOr } from "./settle-model.js";

const FramePageList = ({
  path,
  routes,
  load,
  pick,
  close,
}: {
  path: string;
  routes: boolean;
  load: () => Promise<string[]>;
  pick: (raw: string) => boolean;
  close: (refocus: boolean) => void;
}): ReactElement => {
  const [pages, setPages] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;

    const fill = async (): Promise<void> => {
      const list = await toValueOr(load(), []);

      if (alive) {
        setPages(list);
      }
    };

    void fill();

    return (): void => {
      alive = false;
    };
  }, [load]);

  const handleKeys = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => menuKeys(event, close),
    [close]
  );

  return (
    <div
      role="menu"
      tabIndex={-1}
      aria-label={copy.pages}
      onKeyDown={handleKeys}
    >
      {pages === null && <p className="frame-page-hint">{copy.loadingPages}</p>}
      {pages?.length === 0 && (
        <p className="frame-page-hint">{copy.noOtherPagesYet}</p>
      )}
      {pages?.map((page) => (
        <FramePageItem
          key={page}
          page={page}
          path={path}
          routes={routes}
          pick={pick}
        />
      ))}
    </div>
  );
};

export { FramePageList };
