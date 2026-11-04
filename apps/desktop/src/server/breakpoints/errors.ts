class BreakpointError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BreakpointError";
  }
}

export { BreakpointError };
