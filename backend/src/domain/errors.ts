export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "REQUEST_FAILED"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function badRequest(message: string, code?: string): AppError {
  return new AppError(400, message, code);
}

export function unauthorized(message = "Iniciá sesión para continuar."): AppError {
  return new AppError(401, message, "UNAUTHORIZED");
}

export function forbidden(message = "No tenés permiso para realizar esta acción."): AppError {
  return new AppError(403, message, "FORBIDDEN");
}

export function notFound(message = "No encontramos ese recurso."): AppError {
  return new AppError(404, message, "NOT_FOUND");
}

export function conflict(message: string, code = "CONFLICT"): AppError {
  return new AppError(409, message, code);
}
