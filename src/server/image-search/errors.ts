class ImageSearchError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ImageSearchError";
  }
}

export { ImageSearchError };
