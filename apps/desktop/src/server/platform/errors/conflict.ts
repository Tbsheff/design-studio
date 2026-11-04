class ConflictError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export { ConflictError };
