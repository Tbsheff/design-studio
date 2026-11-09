import { useEffect, useEffectEvent } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import type { FileMenu } from "./canvas-chrome-menu.js";
import { PagesListRow } from "./pages-list-row.js";
import type { MenuGroup } from "./top-bar-menu-model.js";

const toGroupKey = (group: MenuGroup): string =>
  group.label ?? group.items[0]?.id ?? "pages";

const PagesList = ({
  file,
  host,
}: {
  readonly file: FileMenu;
  readonly host: HTMLElement;
}): ReactElement => {
  const loadPages = useEffectEvent((): void => {
    void file.load();
  });

  useEffect(() => {
    loadPages();
  }, []);

  const list = (
    <div className="column-list">
      {file.groups().map((group) => (
        <section className="column-group" key={toGroupKey(group)}>
          {group.label && <h3 className="column-group-head">{group.label}</h3>}
          {group.items.map((entry) => (
            <PagesListRow key={entry.id} entry={entry} />
          ))}
        </section>
      ))}
    </div>
  );

  return <>{createPortal(list, host)}</>;
};

export { PagesList };
