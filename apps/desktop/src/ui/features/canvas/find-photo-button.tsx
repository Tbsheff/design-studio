import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { runCommand } from "../../canvas-toolbar-slots.js";
import { copy } from "./copy.js";

const findPhoto = (): void => {
  runCommand("image.find");
};

const FindPhotoButton = (): ReactElement => (
  <button
    type="button"
    className="btn small ghost find-photo-btn"
    aria-label={copy.findPhoto}
    data-tip={copy.findAStock}
    onClick={findPhoto}
  >
    <Icon name="image" size={14} />
    <span className="label">{copy.photo}</span>
  </button>
);

export { FindPhotoButton };
