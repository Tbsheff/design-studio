import type { Input } from "@design-studio/actions/_core/action";
import type { deleteProp } from "@design-studio/actions/prop/delete";
import { Effect } from "effect";

import { PropStore, PropWriter } from "../../components/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeletePropInput = Input<typeof deleteProp>;

const SHOWN_SITES = 8;

interface DeleteCommand {
  readonly component: string;
  readonly directionId: string;
  readonly file: string;
  readonly name: string;
  readonly projectId: string;
}

const toCommand = (input: DeletePropInput): DeleteCommand => ({
  component: input.component,
  directionId: input.directionId,
  file: input.file,
  name: input.name,
  projectId: input.projectId,
});

const handle = Effect.fn("prop.delete")(function* run(input: DeletePropInput) {
  const writer = yield* PropWriter;

  return yield* writer.delete(toCommand(input));
}) satisfies Handle<typeof deleteProp>;

const preview = Effect.fn("prop.delete.preview")(function* card(
  input: DeletePropInput
) {
  const store = yield* PropStore;
  const change = yield* store.previewDelete(toCommand(input));

  const shown = change.callSites
    .slice(0, SHOWN_SITES)
    .map((site) => `${site.file}:${site.line}`);

  const hidden = change.callSites.length - shown.length;
  let more = "";
  let sites = "no use site sets it";

  if (hidden > 0) {
    more = `, and ${hidden} more`;
  }

  if (shown.length > 0) {
    sites = shown.join(", ");
  }

  return {
    action: "Delete a component prop",
    detail: `Removes ${input.name} from the type and the body of ${change.component} in ${change.files[0]}. Use sites that change (${change.callSites.length}): ${sites}${more}.`,
    title: `Delete the prop ${input.name} of ${change.component}`,
  };
}) satisfies Preview<typeof deleteProp>;

export { handle, preview };
