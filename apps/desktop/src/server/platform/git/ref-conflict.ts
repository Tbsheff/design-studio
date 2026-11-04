class RefConflictError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = "RefConflictError";
  }
}

export { RefConflictError };
