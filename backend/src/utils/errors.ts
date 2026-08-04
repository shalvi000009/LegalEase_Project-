export interface StandardErrorResponse {
  error_code: string;
  message: string;
  details?: any;
}

export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, errorCode: string = "INTERNAL_SERVER_ERROR", details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access", details?: any) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, "CONFLICT", details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", details?: any) {
    super(message, 404, "NOT_FOUND", details);
  }
}
