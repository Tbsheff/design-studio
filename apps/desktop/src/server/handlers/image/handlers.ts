// @generated
import type { ImageActions } from "../../../shared/actions/image/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as createImageHandle } from "./create.js";
import { handle as inspectImageHandle } from "./inspect.js";

const ImageEntries = {
  createImage: { handle: createImageHandle },
  inspectImage: { handle: inspectImageHandle },
} satisfies Entries<typeof ImageActions>;

export { ImageEntries };
