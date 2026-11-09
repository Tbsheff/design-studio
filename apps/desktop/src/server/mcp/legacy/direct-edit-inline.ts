import { BREAKPOINT_TOOLS } from "../breakpoints-tools.js";
import { defineTool } from "../edit-kit.js";
import type { ToolSpec } from "../edit-kit.js";
import { editElementSchema, writeFileSchema } from "./direct-edit-schema.js";
import { editElement } from "./edit-element.js";
import { writeProjectFile } from "./write-file.js";

const writeFileTool = defineTool(
  "write_file",
  writeFileSchema,
  {
    description:
      'Write or replace one text file in the project folder and save it as a version labelled "Edit by <client>", so the user can undo it. The same path rules as the studio agent apply: no .studio/, no files outside the project, no build config files, no generated design-system/tokens.css.',
    title: "Write file",
  },
  writeProjectFile
);

const editElementTool = defineTool(
  "edit_element",
  editElementSchema,
  {
    description:
      'Change the style, the Tailwind classes or the text of one element, found by CSS selector on a page, with the same code path as the studio inspector. In a Tailwind project style changes become theme classes; the result lists the classes and says when the edit fell back to inline style. Pass variant ("md:", "hover:", "md:hover:", "dark:") to set the style for a breakpoint or state only. Or pass op to delete, duplicate, wrap in an auto layout frame, unwrap, or move the element into targetSelector, with the same code path as the studio layers and canvas menu. The ops refuse elements made by .map(), a condition or a function call. Text that comes from a prop, a literal array or object (also through .map()), a constant, a default prop value or an i18n messages JSON key changes where it is written, and textSource in the result says where; text from fetched or runtime data is refused with the reason. In an attached app, the outer element of a shared component use (such as <Button>, <Badge> or <CardTitle> from packages/ui) is edited where it is used by default: its className prop and text in the page file, so only this use changes; target "component" edits the component file and changes every use. The result says which file and line changed (at, editedAt). The source file changes and a version is saved, so the user can undo it. Aspect lock: classes.add aspect-square, aspect-video or aspect-[w/h] with h-auto, and classes.remove the old h-* and size-* classes; unlock by adding h-[Npx] and removing aspect-* and h-auto. Truncate: classes.add truncate (one line) or line-clamp-2 to line-clamp-6, and remove whitespace-*, overflow-*, text-ellipsis and old line-clamp-*. In plain CSS, pass style: aspect-ratio "w / h" with height "auto" for the lock, and overflow "hidden" with text-overflow "ellipsis" and white-space "nowrap" for one-line truncate.',
    title: "Edit element",
  },
  editElement
);

const DIRECT_EDIT_INLINE_TOOLS: ToolSpec[] = [
  writeFileTool,
  editElementTool,
  ...BREAKPOINT_TOOLS,
];

export { DIRECT_EDIT_INLINE_TOOLS };
