import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/db";
import { ConflictError, UnauthorizedError } from "../utils/errors";

const SALT_ROUNDS = 10;
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "default_access_secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default_refresh_secret";
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function calculateExpiryDate(expiryStr: string): Date {
  const now = new Date();
  if (expiryStr.endsWith("d")) {
    const days = parseInt(expiryStr.slice(0, -1), 10) || 7;
    now.setDate(now.getDate() + days);
  } else if (expiryStr.endsWith("h")) {
    const hours = parseInt(expiryStr.slice(0, -1), 10) || 24;
    now.setHours(now.getHours() + hours);
  } else if (expiryStr.endsWith("m")) {
    const minutes = parseInt(expiryStr.slice(0, -1), 10) || 15;
    now.setMinutes(now.getMinutes() + minutes);
  } else {
    now.setDate(now.getDate() + 7);
  }
  return now;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  created_at: Date;
}

export class AuthService {
  private static generateTokens(userId: string, email: string): AuthTokens {
    const accessToken = jwt.sign(
      { sub: userId, email },
      ACCESS_SECRET,
      { expiresIn: ACCESS_EXPIRY as any }
    );

    const refreshToken = jwt.sign(
      { sub: userId, email, jti: crypto.randomUUID() },
      REFRESH_SECRET,
      { expiresIn: REFRESH_EXPIRY as any }
    );

    return { accessToken, refreshToken };
  }

  private static async createRefreshTokenRecord(userId: string, rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = calculateExpiryDate(REFRESH_EXPIRY);

    await prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });
  }

  public static async register(name: string, email: string, password: string): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError("A user with this email address already exists");
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
      },
    });

    const tokens = this.generateTokens(user.id, user.email);
    await this.createRefreshTokenRecord(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      tokens,
    };
  }

  public static async login(email: string, password: string): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const tokens = this.generateTokens(user.id, user.email);
    await this.createRefreshTokenRecord(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      tokens,
    };
  }

  public static async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    let payload: any;
    try {
      payload = jwt.verify(rawRefreshToken, REFRESH_SECRET);
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const tokenHash = hashToken(rawRefreshToken);
    const existingToken = await prisma.refreshToken.findFirst({
      where: {
        token_hash: tokenHash,
        user_id: payload.sub,
      },
    });

    if (!existingToken || existingToken.revoked_at !== null || existingToken.expires_at < new Date()) {
      throw new UnauthorizedError("Refresh token is invalid, expired, or has been revoked");
    }

    // Revoke used refresh token for rotation
    await prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revoked_at: new Date() },
    });

    const newTokens = this.generateTokens(payload.sub, payload.email);
    await this.createRefreshTokenRecord(payload.sub, newTokens.refreshToken);

    return newTokens;
  }
}
