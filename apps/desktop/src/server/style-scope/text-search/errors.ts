class TextSearchError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TextSearchError";
  }
}

export { TextSearchError };
