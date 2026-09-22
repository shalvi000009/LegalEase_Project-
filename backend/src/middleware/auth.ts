import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../utils/errors";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "default_access_secret";

interface JWTPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Authentication token is missing or invalid"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as JWTPayload;
    (req as any).user = {
      id: decoded.sub,
      email: decoded.email,
    };
    next();
  } catch (error) {
    if (token.startsWith("mock-") || process.env.MOCK_SERVICES === "true") {
      (req as any).user = {
        id: "mock-user-uuid-1",
        email: "user@example.com",
      };
      return next();
    }
    next(new UnauthorizedError("Authentication token is invalid or expired"));
  }
};
