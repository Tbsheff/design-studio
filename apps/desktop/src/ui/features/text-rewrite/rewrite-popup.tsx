import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { RewriteLanguages } from "./rewrite-languages.js";
import { RewriteMenuList } from "./rewrite-menu-list.js";
import { RewriteOptions } from "./rewrite-options.js";
import type { RewriteView } from "./use-rewrite-view.js";
import type { TextRewrite } from "./use-text-rewrite.js";

import styles from "./text-rewrite.module.css";

interface RewritePopupProps {
  readonly rewrite: TextRewrite;
  readonly state: RewriteView;
}

const RewritePopup = ({
  rewrite,
  state,
}: RewritePopupProps): ReactElement | null => {
  if (state.view === "menu") {
    return (
      <RewriteMenuList
        onLanguages={state.handleLanguages}
        onPick={state.handleMode}
      />
    );
  }

  if (state.view === "languages") {
    return (
      <RewriteLanguages
        onBack={state.handleMenu}
        onPick={state.handleLanguage}
      />
    );
  }

  if (state.view === "options" && rewrite.result === null) {
    return <p className={styles.hint}>{copy.working}</p>;
  }

  if (state.view === "options") {
    return (
      <RewriteOptions
        rewrite={rewrite}
        onApply={state.handleApply}
        onCancel={state.handleCancel}
      />
    );
  }

  return null;
};

export { RewritePopup };
