// @generated
import type { FixtureActions } from "@design-studio/actions/fixture/index";

import type { Entries } from "../_core/handler.js";
import { handle as createFixtureHandle } from "./create.js";
import {
  handle as deleteFixtureHandle,
  preview as deleteFixturePreview,
} from "./delete.js";
import { handle as listFixtureHandle } from "./list.js";

const FixtureEntries = {
  createFixture: { handle: createFixtureHandle },
  deleteFixture: { handle: deleteFixtureHandle, preview: deleteFixturePreview },
  listFixture: { handle: listFixtureHandle },
} satisfies Entries<typeof FixtureActions>;

export { FixtureEntries };
