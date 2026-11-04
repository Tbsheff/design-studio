import { ConflictError } from "./conflict.js";

interface PickCandidate {
  readonly appDir: string;
}

class PickAppError<
  Candidate extends PickCandidate = PickCandidate,
> extends ConflictError {
  public readonly candidates: Candidate[];

  public constructor(candidates: Candidate[]) {
    super(
      `This folder has ${candidates.length} Next.js apps. Pick one: ${candidates.map((candidate) => candidate.appDir).join(", ")}.`
    );
    this.name = "PickAppError";
    this.candidates = candidates;
  }
}

export { PickAppError };
