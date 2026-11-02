export class EditError extends Error {
  public readonly code: string | null;

  public constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "EditError";
    this.code = code;
  }
}
