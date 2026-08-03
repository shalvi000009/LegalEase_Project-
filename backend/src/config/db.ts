import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: any };
const isMock = process.env.MOCK_SERVICES === "true";

class MockPrisma {
  private users: any[] = [];
  private refreshTokens: any[] = [];
  private documents: any[] = [];

  public user = {
    findUnique: async ({ where }: any) => {
      return this.users.find(u => u.email === where.email || u.id === where.id) || null;
    },
    create: async ({ data }: any) => {
      const u = {
        id: data.id || "mock-user-uuid-" + Date.now(),
        name: data.name,
        email: data.email,
        password_hash: data.password_hash,
        created_at: new Date(),
      };
      this.users.push(u);
      return u;
    }
  };

  public refreshToken = {
    create: async ({ data }: any) => {
      const rt = {
        id: "mock-rt-uuid-" + Date.now(),
        user_id: data.user_id,
        token_hash: data.token_hash,
        expires_at: data.expires_at,
        created_at: new Date(),
        revoked_at: null,
      };
      this.refreshTokens.push(rt);
      return rt;
    },
    findFirst: async ({ where }: any) => {
      return this.refreshTokens.find(t => t.token_hash === where.token_hash && t.user_id === where.user_id) || null;
    },
    update: async ({ where, data }: any) => {
      const rt = this.refreshTokens.find(t => t.id === where.id);
      if (rt) {
        Object.assign(rt, data);
        return rt;
      }
      throw new Error("RefreshToken not found");
    }
  };

  public document = {
    create: async ({ data }: any) => {
      const doc = {
        id: data.id || "mock-uuid-" + Date.now(),
        user_id: data.user_id,
        filename: data.filename,
        s3_key: data.s3_key,
        status: data.status || "uploaded",
        created_at: new Date(),
      };
      this.documents.push(doc);
      return doc;
    },
    findFirst: async ({ where }: any) => {
      return this.documents.find(d => d.id === where.id && d.user_id === where.user_id) || null;
    },
    findMany: async ({ where, skip, take }: any) => {
      const filtered = this.documents.filter(d => d.user_id === where.user_id);
      return filtered.slice(skip || 0, (skip || 0) + (take || 10));
    },
    count: async ({ where }: any) => {
      return this.documents.filter(d => d.user_id === where.user_id).length;
    },
    update: async ({ where, data }: any) => {
      const doc = this.documents.find(d => d.id === where.id);
      if (doc) {
        Object.assign(doc, data);
        return doc;
      }
      throw new Error("Document not found");
    }
  };

  public $disconnect = async () => {};
}

export const prisma = isMock
  ? (globalForPrisma.prisma || new MockPrisma())
  : (globalForPrisma.prisma || new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"] }));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
