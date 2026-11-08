class StackingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "StackingError";
  }
}

export { StackingError };
