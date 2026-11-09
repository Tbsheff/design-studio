import type { Input } from "@design-studio/actions/_core/action";
import type { deleteSectionCanvas } from "@design-studio/actions/canvas/delete-section";
import { Effect } from "effect";

import { CanvasStore, CanvasWriter } from "../../canvas/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteSectionCanvasInput = Input<typeof deleteSectionCanvas>;

interface SectionQuery {
  readonly directionId: string | null;
  readonly projectId: string;
  readonly section: string;
}

const toQuery = (input: DeleteSectionCanvasInput): SectionQuery => ({
  directionId: input.directionId ?? null,
  projectId: input.projectId,
  section: input.section,
});

const handle = Effect.fn("canvas.deleteSection")(function* run(
  input: DeleteSectionCanvasInput
) {
  const writer = yield* CanvasWriter;

  return yield* writer.deleteSection(toQuery(input));
}) satisfies Handle<typeof deleteSectionCanvas>;

const preview = Effect.fn("canvas.deleteSection.preview")(function* card(
  input: DeleteSectionCanvasInput
) {
  const store = yield* CanvasStore;

  return yield* store.deleteSectionCard(toQuery(input));
}) satisfies Preview<typeof deleteSectionCanvas>;

export { handle, preview };
