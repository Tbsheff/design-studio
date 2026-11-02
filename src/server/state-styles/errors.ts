class StateStyleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "StateStyleError";
  }
}

export { StateStyleError };
