class PageImportError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PageImportError";
  }
}

export { PageImportError };
