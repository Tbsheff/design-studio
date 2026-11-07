// @generated
import type { ThemeActions } from "@design-studio/actions/theme/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyThemeHandle } from "./apply.js";
import { handle as createThemeHandle } from "./create.js";
import { handle as listThemeHandle } from "./list.js";
import { handle as setThemeHandle } from "./set.js";

const ThemeEntries = {
  applyTheme: { handle: applyThemeHandle },
  createTheme: { handle: createThemeHandle },
  listTheme: { handle: listThemeHandle },
  setTheme: { handle: setThemeHandle },
} satisfies Entries<typeof ThemeActions>;

export { ThemeEntries };
