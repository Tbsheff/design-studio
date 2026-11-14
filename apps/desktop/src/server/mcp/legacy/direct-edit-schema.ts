import { STRUCTURE_OPS } from "@design-studio/contracts";

import { EDIT_TARGETS } from "../../direct-edit/commit/index.js";
import { z } from "../../platform/zod-bridge/index.js";
import {
  classes,
  directionId,
  hasClasses,
  pagePath,
  PATH_MAX,
  projectId,
  selector,
  style,
  variant,
} from "../edit-kit.js";

const FILE_MAX = 524_288;

const TEXT_MAX = 5000;

const ALSO_MAX = 49;

const targetFields = { directionId, projectId };

const writeFileSchema = z.strictObject({
  ...targetFields,
  content: z.string().max(FILE_MAX).describe("The full new text of the file."),
  path: z
    .string()
    .trim()
    .min(1)
    .max(PATH_MAX)
    .describe(
      'File path relative to the project folder, for example "index.html" or "styles/site.css".'
    ),
});

const alsoItem = z.strictObject({
  selector: selector.describe("CSS selector or layer id."),
});

const alsoList = z
  .array(alsoItem)
  .min(1)
  .max(ALSO_MAX)
  .optional()
  .describe(
    "With op: more elements to change in the same edit, like a multi-select in the studio. For group and wrap they must be siblings in one file. Layer ids from select_matching work here."
  );

const editFields = z.strictObject({
  ...targetFields,
  also: alsoList,
  classes: classes.optional(),
  op: z
    .enum(STRUCTURE_OPS)
    .optional()
    .describe(
      'Structure edit instead of style/text: delete, duplicate, wrap (in a flex column frame), group (in a plain <div data-name="Group"> with no layout, like Cmd+G), unwrap (keep the children, drop the element; also ungroups) or move (into targetSelector, as its last child).'
    ),
  path: pagePath,
  selector: selector.describe("CSS selector of one element on the page."),
  style: style
    .optional()
    .describe(
      "CSS properties to set, as kebab-case (margin-left) or camelCase (marginLeft) keys. null removes the property. In a Tailwind project the server writes theme classes (p-6, bg-primary, rounded-lg) instead of inline style, and an arbitrary value only when no theme step fits. Use rotate (45deg writes rotate-45) and scale (-1 1 flips horizontally to -scale-x-100, 1 -1 flips vertically)."
    ),
  target: z
    .enum(EDIT_TARGETS)
    .optional()
    .describe(
      'Attached apps only. Leave out: an element that is the outer element of a shared component use (such as <Button> or <CardTitle> from packages/ui) is edited where it is used (its className prop and text in the page file), so only this use changes; other elements are edited in their own file. "component" edits the element in the shared component file, which changes every use ("element" is the same). "use" asks for the use site and fails when there is none.'
    ),
  targetSelector: selector
    .optional()
    .describe("For op move: CSS selector of the new parent element."),
  text: z
    .string()
    .max(TEXT_MAX)
    .optional()
    .describe("New text content of the element."),
  variant: variant.optional(),
});

type EditFields = z.output<typeof editFields>;

const absent = <Value>(value: Value | undefined): boolean =>
  (value ?? null) === null;

const hasStyle = (input: EditFields): boolean =>
  Object.keys(input.style ?? {}).length > 0;

const changesContent = (input: EditFields): boolean =>
  !absent(input.text) || hasClasses(input) || hasStyle(input);

const opAlone = (input: EditFields): boolean =>
  absent(input.text) &&
  absent(input.style) &&
  absent(input.classes) &&
  absent(input.variant);

const partsFit = (input: EditFields): boolean => {
  if (absent(input.op)) {
    return changesContent(input);
  }

  return opAlone(input);
};

const editElementSchema = editFields
  .refine((input) => absent(input.also) || !absent(input.op), "also needs op")
  .refine(partsFit, "pass style, text or classes, or op alone")
  .refine(
    (input) => (input.op === "move") === !absent(input.targetSelector),
    "op move needs targetSelector; other ops take none"
  )
  .refine(
    (input) => input.target !== "use" || absent(input.op),
    "target use takes style, classes or text, not op"
  );

type WriteFileInput = z.output<typeof writeFileSchema>;

type EditElementInput = z.output<typeof editElementSchema>;

export { editElementSchema, writeFileSchema };

export type { EditElementInput, WriteFileInput };
