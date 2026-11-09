import { createContext } from "react";

import type { SubmenuProps } from "./preview-menu-model.js";

const SUBMENU_IDLE: SubmenuProps = { focusTick: 0, onExit: () => null };

const SubmenuContext = createContext<SubmenuProps>(SUBMENU_IDLE);

export { SubmenuContext };
