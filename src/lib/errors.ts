// Dependency-free error types, importable from Server Actions, services and scripts alike.

export class PermissionError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "PermissionError";
  }
}

/** Thrown for expected, user-facing failures (duplicate slug, in-use media…). */
export class UserFacingError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
