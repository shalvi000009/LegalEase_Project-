import { Request, Response, NextFunction } from "express";
import { AppError, StandardErrorResponse } from "../utils/errors";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    const errorResponse: StandardErrorResponse = {
      error_code: err.errorCode,
      message: err.message,
      ...(err.details && { details: err.details }),
    };
    res.status(err.statusCode).json(errorResponse);
    return;
  }

  console.error("Unhandled Error:", err);
  const internalResponse: StandardErrorResponse = {
    error_code: "INTERNAL_SERVER_ERROR",
    message: err.message || "An unexpected error occurred",
  };
  res.status(500).json(internalResponse);
};
