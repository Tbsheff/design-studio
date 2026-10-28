import { z } from 'zod';
import { JSX_IMPORTS_MAX, JSX_INSERT_POSITIONS, JSX_SNIPPET_MAX, type InsertJsxResult } from '../../shared/insert.js';
import { EditError, loadTarget, refuseWhileRunning, studioCall } from './edit-deps.js';
import { base, defineTool, directionId, ok, pagePath, projectId, selector, versionActivity, type Done } from './edit-kit.js';
import { targetOf } from './insert-tools.js';

export const INSERT_JSX_DESCRIPTION =
  'Build a group of elements in one call: insert a JSX snippet (or an HTML snippet in an HTML project) inside, before, after or in place of the target element. Use the app\'s own components and Tailwind token classes, for example <Card><CardHeader><CardTitle>Recent documents</CardTitle></CardHeader><CardContent>…<Badge variant="outline">Signed</Badge><Button size="sm">Open</Button></CardContent></Card>. Each component tag that the target file does not import is found in the project library and its import line is added or extended with the path the project uses (all parts of a module in one line). The snippet keeps your line breaks and gets the file\'s indent. Markup only: text, string props, numbers, style objects and plain references such as onClick={handleSave} to names the file has; functions, hook or other calls, conditions, .map() and {...spread} are refused with a reason. Targets made by .map() or shown by a condition are refused. One version and one undo step. To remove placeholder text next to child elements, use clear_text.';

const schema = z
  .object({
    projectId,
    directionId,
    path: pagePath,
    targetSelector: selector.optional().describe('CSS selector of the target element on the page, for example "main" or "[data-name=\'Hero\'] h2".'),
    targetSource: z.string().trim().max(1100).optional().describe('Or the target element as file:line:col of its JSX tag, for example "src/App.tsx:12:7" (the at of an earlier insert). Use this or targetSelector.'),
    position: z.enum(JSX_INSERT_POSITIONS as ['inside', 'before', 'after', 'replace']).default('inside').describe('inside: after the last child of the target. before / after: a sibling of the target. replace: the snippet takes the place of the target element.'),
    jsx: z.string().min(1).max(JSX_SNIPPET_MAX).describe('The snippet: one or more elements, with line breaks and any indent.'),
    imports: z
      .record(z.string().regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/), z.string().trim().min(1).max(1000))
      .refine((value) => Object.keys(value).length <= JSX_IMPORTS_MAX, `pass at most ${JSX_IMPORTS_MAX} imports`)
      .optional()
      .describe('Only when two library components have the same name: component name to its file, relative to the project, for example {"Button": "packages/ui/src/components/button.tsx"}.'),
  })
  .strict()
  .refine((input) => (input.targetSelector === undefined) !== (input.targetSource === undefined), 'pass targetSelector or targetSource, not both');

const insertJsx = defineTool('insert_jsx', schema, { title: 'Insert JSX', description: INSERT_JSX_DESCRIPTION }, async (deps, input): Promise<Done> => {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  refuseWhileRunning(deps, project, direction);
  const target = await targetOf(deps, project, direction, input);
  const body = { target, position: input.position, jsx: input.jsx, ...(input.imports ? { imports: input.imports } : {}) };
  let result: InsertJsxResult;
  try {
    result = await studioCall<InsertJsxResult>(deps, 'POST', `${base(project, direction.id)}/insert/jsx`, body);
  } catch (error) {
    throw new EditError(error instanceof Error ? error.message : String(error));
  }
  const at = result.select.map((item) => `${item.file}:${item.line}:${item.col}`);
  const output = ok({ file: result.file, title: result.title, at, imports: result.imports, usedAt: result.usedAt, versionId: result.version?.id ?? null });
  return { result: output, activity: versionActivity(project, direction, result.title, result.version) };
});

const clearSchema = z
  .object({
    projectId,
    directionId,
    path: pagePath,
    targetSelector: selector.optional().describe('CSS selector of the element whose text to clear, for example "[data-slot=card]".'),
    targetSource: z.string().trim().max(1100).optional().describe('Or the element as file:line:col of its JSX tag (the at of insert_component).'),
  })
  .strict()
  .refine((input) => (input.targetSelector === undefined) !== (input.targetSource === undefined), 'pass targetSelector or targetSource, not both');

const clearText = defineTool(
  'clear_text',
  clearSchema,
  { title: 'Clear text', description: 'Remove the plain text inside an element and keep its child elements, for example the placeholder "Card" that insert_component leaves next to the CardHeader you added. On a library component (Card, Button) it clears the text where the page uses it, not in the component file. Text from a prop or a { } expression stays. One version and one undo step. edit_element op "clear" does the same on an element in its own file.' },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    refuseWhileRunning(deps, project, direction);
    const target = await targetOf(deps, project, direction, input);
    let result: InsertJsxResult;
    try {
      result = await studioCall<InsertJsxResult>(deps, 'POST', `${base(project, direction.id)}/insert/clear-text`, { target });
    } catch (error) {
      throw new EditError(error instanceof Error ? error.message : String(error));
    }
    const at = result.select.map((item) => `${item.file}:${item.line}:${item.col}`);
    return { result: ok({ file: result.file, title: result.title, at, usedAt: result.usedAt, versionId: result.version?.id ?? null }), activity: versionActivity(project, direction, result.title, result.version) };
  },
);

export const JSX_INSERT_TOOLS = [insertJsx, clearText];
