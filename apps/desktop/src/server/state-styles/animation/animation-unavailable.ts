import { Unavailable } from "@design-studio/actions/_core/errors/unavailable";

class CaptureUnavailableError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CaptureUnavailableError";
  }
}

const toUnavailable = (cause: unknown): Unavailable | null => {
  if (cause instanceof CaptureUnavailableError) {
    return new Unavailable({ message: cause.message });
  }

  return null;
};

export { CaptureUnavailableError, toUnavailable };
