import { api, errorText } from "../../api.js";
import type { ContextDraft } from "./context-drafts-model.js";

const importOne = async (
  projectId: string,
  context: ContextDraft
): Promise<void> => {
  if (context.path !== null) {
    await api.importReferencePath(projectId, context.path);
  }

  if (context.file !== null) {
    await api.importReferenceFile(projectId, context.file);
  }
};

const importContexts = async (
  projectId: string,
  contexts: ContextDraft[]
): Promise<void> => {
  const settled = await Promise.allSettled(
    contexts.map((context) => importOne(projectId, context))
  );

  const failures: string[] = [];

  for (const [index, result] of settled.entries()) {
    if (result.status === "rejected") {
      const label = contexts[index]?.label ?? "a reference";
      failures.push(`${label} (${errorText(result.reason)})`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Could not add ${failures.join(", ")}. The project was created. Open it from the list to try again.`
    );
  }
};

export { importContexts };
