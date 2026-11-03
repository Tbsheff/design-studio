import { z } from "zod";

import { getComponentPreviewOf } from "../direct-edit/direct-edit-insert-ops.js";
import { directEditCall } from "./direct-edit-call.js";
import { EditError, loadTarget } from "./edit-deps.js";
import { defineTool, directionId, projectId } from "./edit-kit.js";
import type { Done, ToolSpec } from "./edit-kit.js";

const previewSchema = z
  .object({
    projectId,
    directionId,
    name: z
      .string()
      .regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/)
      .optional()
      .describe('Component name from list_components, for example "Button".'),
    file: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .describe(
        "File of the component, relative to the project, when two components have the same name."
      ),
    id: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .describe(
        'Or the component id as the studio Components panel lists it: "<file>#<Name>".'
      ),
  })
  .strict()
  .refine(
    (input) => (input.name === undefined) !== (input.id === undefined),
    "pass name (and file) or id"
  );

const componentPreview = defineTool(
  "component_preview",
  previewSchema,
  {
    title: "Component preview",
    description:
      "Read only. Render one React component of the project library alone with its default props, with the same server code as the tiles of the studio Components panel, and return the PNG. Required props get a value from the props type, variant props keep their default, a component that takes children gets its name as text, and a compound component (Card, Alert) gets its Header, Title, Description and Content parts. The page uses the app CSS from its dev server, so it looks like the app. Next.js link, image and navigation are stubbed; components that need data, server code or an open state are refused with the reason. Renders are cached per file content.",
    readOnly: true,
    idempotent: true,
  },
  async (deps, input): Promise<Done> => {
    const { project, direction } = await loadTarget(
      deps,
      input.projectId,
      input.directionId
    );

    if (project.kind !== "react") {
      throw new EditError(
        "This is an HTML project. It has no component kit to preview."
      );
    }

    const preview = await directEditCall(
      { directionId: direction.id, projectId: project.id },
      (runtime, ref) =>
        getComponentPreviewOf(runtime, ref, {
          ...(input.id ? { id: input.id } : {}),
          ...(input.name ? { name: input.name } : {}),
          ...(input.file ? { file: input.file } : {}),
        })
    );

    const meta = JSON.stringify({
      cached: preview.cached,
      component: preview.component,
      props: preview.props,
      text: preview.text,
    });

    return {
      result: {
        content: [
          {
            type: "image",
            data: preview.png,
            mimeType: "image/png",
          },
          { type: "text", text: meta },
        ],
      },
    };
  }
);

export const COMPONENT_PREVIEW_TOOLS: ToolSpec[] = [componentPreview];
