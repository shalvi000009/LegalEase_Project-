import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { StandardErrorResponse } from "../utils/errors";

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join(".").replace(/^body\./, ""),
          message: err.message,
        }));

        const responsePayload: StandardErrorResponse = {
          error_code: "VALIDATION_ERROR",
          message: "Validation failed",
          details,
        };

        res.status(400).json(responsePayload);
        return;
      }
      next(error);
    }
  };
};
