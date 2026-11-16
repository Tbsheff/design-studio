import type { PreviewService } from "../../shared/server-ports.js";
import { referenceNote, withReference } from "./final-check.js";
import type { DriverInput, DriverOutcome } from "./lifecycle.js";
import { runReferencePass } from "./reference-check.js";

interface MockReferenceSession {
  readonly say: (text: string) => Promise<void>;
}

const applyMockReference = async (
  input: DriverInput,
  session: MockReferenceSession,
  previewService: PreviewService | undefined,
  outcome: DriverOutcome
): Promise<DriverOutcome> => {
  if (!previewService || outcome.status !== "completed") {
    return outcome;
  }

  const continueFix = async (
    fixText: string,
    images: unknown[]
  ): Promise<boolean> => {
    input.sink.sent({
      continuation: 1,
      imageCount: images.length,
      promptHash: "mock",
      recommendedSkills: [],
      resume: input.ctx.direction.sessionId,
      text: fixText,
      updatedInstructions: false,
    });
    await session.say(
      "Mock fix loop: compared the frame with the reference picture again."
    );

    return true;
  };

  const reference = await runReferencePass({
    continueWith: continueFix,
    ctx: input.ctx,
    preview: previewService,
    runId: input.runId,
    runsDir: input.runsDir,
  });

  const finalCheck = withReference(outcome.finalCheck, reference);

  if (!reference || !finalCheck) {
    return outcome;
  }

  return {
    ...outcome,
    finalCheck,
    finalText: `${outcome.finalText}\n\n${referenceNote(reference)}`,
  };
};

const toMockStatus = (
  request: DriverInput["ctx"]["request"]
): DriverOutcome["status"] => {
  if (request.prompt.includes("[budget]") && !request.retryOf) {
    return "budget_exceeded";
  }

  return "completed";
};

export { applyMockReference, toMockStatus };
