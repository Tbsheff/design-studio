import { COPY_CODE_TOOLS } from "../copy-code-tools.js";
import { defineTool } from "../edit-kit.js";
import type { ToolSpec } from "../edit-kit.js";
import { EXPORT_TOOLS } from "../export-tools.js";
import { exportFiles } from "./export-files.js";
import { exportSchema } from "./export-schema.js";

const exportTool = defineTool(
  "export",
  exportSchema,
  {
    description:
      "Export a version as PNG, HTML, PDF, a handoff zip or a source zip and write the files to a folder. Returns the file paths. Default folder: the Design Studio data folder, exports/<projectId>. A folder outside Downloads and the projects folder waits for the user to approve it in Design Studio.",
    title: "Export",
  },
  exportFiles
);

const EXPORT_LEGACY_TOOLS: ToolSpec[] = [
  exportTool,
  ...EXPORT_TOOLS,
  ...COPY_CODE_TOOLS,
];

export { EXPORT_LEGACY_TOOLS };
