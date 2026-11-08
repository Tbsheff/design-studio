import type { InsertableComponent } from "@design-studio/contracts/insert";
import { PanelHead } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback, useState } from "react";

import { InsertMenu } from "./component-insert.js";
import { ComponentsCount } from "./components-count.js";
import { ComponentsFoot } from "./components-foot.js";
import type { Item } from "./components-panel-model.js";
import type { MenuAnchor, Props } from "./components-panel-props.js";
import { ComponentsScroll } from "./components-scroll.js";
import { ComponentsSearch } from "./components-search.js";
import { COPY } from "./copy.js";
import { DragGhost } from "./drag-ghost.js";
import { useComponentDrag } from "./use-component-drag.js";
import { useComponentItems } from "./use-component-items.js";

const SEARCH_MIN_COUNT = 6;

const toTotal = (all: Item[] | null): number | null => {
  if (all) {
    return all.length;
  }

  return null;
};

interface MenuState {
  at: MenuAnchor;
  component: InsertableComponent;
}

const ComponentsPanel = (props: Props): ReactElement => {
  const canInsert = props.kind === "react";
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [gallery, setGallery] = useState<InsertableComponent | null>(null);
  const drag = useComponentDrag();
  const items = useComponentItems(props, canInsert, query);
  const count = items.all?.length ?? 0;
  const { renderGallery } = props;

  const openMenu = useCallback(
    (component: InsertableComponent, at: MenuAnchor): void => {
      setMenu({ at, component });
    },
    []
  );

  const closeMenu = useCallback((): void => {
    setMenu(null);
  }, []);

  const closeGallery = useCallback((): void => {
    setGallery(null);
  }, []);

  return (
    <div className="cmp">
      <PanelHead
        title={COPY.titleComponents}
        headClass="ins-header cmp-header"
        titleClassName="cmp-title"
      >
        <ComponentsCount count={toTotal(items.all)} />
      </PanelHead>
      {count > SEARCH_MIN_COUNT && (
        <ComponentsSearch query={query} onChange={setQuery} />
      )}
      <ComponentsScroll
        all={items.all}
        canInsert={canInsert}
        drag={drag}
        error={items.error}
        props={props}
        query={query}
        retry={items.retry ?? null}
        shown={items.shown}
        onGallery={setGallery}
        onInsertMenu={openMenu}
      />
      {renderGallery?.({ component: gallery, onClose: closeGallery })}
      <ComponentsFoot canInsert={canInsert} count={count} />
      {menu && (
        <InsertMenu
          component={menu.component}
          at={menu.at}
          selection={props.selection?.at(-1)}
          onClose={closeMenu}
        />
      )}
      <DragGhost ghost={drag.ghost} />
    </div>
  );
};

export { ComponentsPanel };
