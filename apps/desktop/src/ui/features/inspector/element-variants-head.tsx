import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { CLOSE_ICON_SIZE } from "./element-variants-model.js";
import { ElementVariantsPrompt } from "./element-variants-prompt.js";

interface Props {
  readonly tag: string;
  readonly onCancel: () => void;
}

const ElementVariantsHead = ({ tag, onCancel }: Props): ReactElement => (
  <header className="variation-card-head">
    <div className="variation-card-heading">
      <h2 id="element-variants-title">{copy.tryVariants}</h2>
      <ElementVariantsPrompt tag={tag} />
    </div>
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.close}
      onClick={onCancel}
    >
      <Icon name="close" size={CLOSE_ICON_SIZE} />
    </button>
  </header>
);

export { ElementVariantsHead };
