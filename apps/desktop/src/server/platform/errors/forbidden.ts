class ForbiddenError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export { ForbiddenError };
