// @generated
import type { DataModelActions } from "@design-studio/actions/data-model/index";

import type { Entries } from "../_core/handler.js";
import { handle as getDataModelHandle } from "./get.js";
import { handle as listDataModelHandle } from "./list.js";

const DataModelEntries = {
  getDataModel: { handle: getDataModelHandle },
  listDataModel: { handle: listDataModelHandle },
} satisfies Entries<typeof DataModelActions>;

export { DataModelEntries };
