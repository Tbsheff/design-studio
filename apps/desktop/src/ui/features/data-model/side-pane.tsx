import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ModelList } from "./model-list.js";
import type { DataModelState } from "./use-data-model.js";

import styles from "./data-model.module.css";

interface SidePaneProps {
  readonly state: DataModelState;
}

const SidePane = ({ state }: SidePaneProps): ReactElement => {
  const { draft, handlePick, handleSearch, items, selected } = state;

  return (
    <section className={styles.side}>
      <input
        className="ins-input"
        type="search"
        aria-label={copy.search}
        autoComplete="off"
        placeholder={copy.searchHint}
        spellCheck={false}
        value={draft}
        onChange={handleSearch}
      />
      <ModelList items={items} onPick={handlePick} selected={selected} />
    </section>
  );
};

export { SidePane };
