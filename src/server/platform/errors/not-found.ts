const NOT_FOUND = 404;

class NotFoundError extends Error {
  public readonly status = NOT_FOUND;

  public constructor(message?: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export { NotFoundError };
