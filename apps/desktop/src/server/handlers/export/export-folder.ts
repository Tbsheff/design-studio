import type { Input } from "@design-studio/actions/_core/action";
import type { exportFolderExport } from "@design-studio/actions/export/export-folder";
import { Effect } from "effect";

import { ExportStore, ExportWriter } from "../../export/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type ExportFolderExportInput = Input<typeof exportFolderExport>;

const handle = Effect.fn("export.exportFolder")(function* run(
  input: ExportFolderExportInput
) {
  const writer = yield* ExportWriter;

  return yield* writer.folder(input);
}) satisfies Handle<typeof exportFolderExport>;

const preview = Effect.fn("export.exportFolder.preview")(function* card(
  input: ExportFolderExportInput
) {
  const store = yield* ExportStore;

  return yield* store.folderCard(input);
}) satisfies Preview<typeof exportFolderExport>;

export { handle, preview };
