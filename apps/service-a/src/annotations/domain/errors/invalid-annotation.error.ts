export class InvalidAnnotationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = InvalidAnnotationError.name;
  }
}
