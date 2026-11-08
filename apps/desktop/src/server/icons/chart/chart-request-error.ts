class ChartRequestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ChartRequestError";
  }
}

export { ChartRequestError };
