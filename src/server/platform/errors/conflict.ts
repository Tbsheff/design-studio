const CONFLICT = 409;

class ConflictError extends Error {
  public readonly status = CONFLICT;

  public constructor(message?: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export { ConflictError };
