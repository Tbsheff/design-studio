class GridError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "GridError";
  }
}

export { GridError };
