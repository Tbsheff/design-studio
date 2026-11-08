import type { ReactElement } from "react";

import { runCommand } from "../../canvas-toolbar-slots.js";
import { copy } from "./copy.js";

const insertIcon = (): void => {
  runCommand("icon.insert");
};

const InsertIconButton = (): ReactElement => (
  <button
    type="button"
    className="btn small ghost insert-icon-btn"
    aria-label={copy.insertIcon}
    aria-keyshortcuts="I"
    data-tip={copy.insertAnIcon}
    onClick={insertIcon}
  >
    <svg
      className="icon"
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 2l1.6 3.6L13.5 6l-2.9 2.6.8 3.9L8 10.6l-3.4 1.9.8-3.9L2.5 6l3.9-.4z" />
    </svg>
    <span className="label">{copy.icon}</span> <kbd>{copy.keyI}</kbd>
  </button>
);

export { InsertIconButton };
