import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: any };
const isMock = process.env.MOCK_SERVICES === "true";

class MockPrisma {
  private users: any[] = [];
  private refreshTokens: any[] = [];
  private documents: any[] = [];
  private analyses: any[] = [];
  private clauses: any[] = [];
  private chatSessions: any[] = [];
  private messages: any[] = [];
  private contractDates: any[] = [];
  private reminders: any[] = [];
  private notificationPreferencesList: any[] = [];

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
        isShared: false,
        shareToken: null,
        sharedAt: null,
      };
      this.documents.push(doc);
      return doc;
    },
    findUnique: async ({ where }: any) => {
      return this.documents.find(d => d.id === where.id || d.shareToken === where.shareToken) || null;
    },
    findFirst: async ({ where }: any) => {
      return this.documents.find(d => d.id === where.id && d.user_id === where.user_id) || null;
    },
    findUnique: async ({ where }: any) => {
      return this.documents.find(d => d.id === where.id) || null;
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

  public analysis = {
    create: async ({ data }: any) => {
      const a = {
        id: data.id || "mock-analysis-uuid-" + Date.now(),
        document_id: data.document_id,
        overall_risk_score: data.overall_risk_score,
        model_version: data.model_version,
        created_at: new Date(),
      };
      this.analyses.push(a);
      return a;
    },
    findFirst: async ({ where, include }: any) => {
      const a = this.analyses.find(item => item.document_id === where.document_id || item.id === where.id);
      if (!a) return null;
      
      const copy = { ...a };
      if (include && include.clauses) {
        copy.clauses = this.clauses.filter(c => c.analysis_id === a.id);
      }
      return copy;
    }
  };

  public clause = {
    createMany: async ({ data }: any) => {
      const newClauses = data.map((c: any) => ({
        id: "mock-clause-uuid-" + Math.random(),
        analysis_id: c.analysis_id,
        clause_type: c.clause_type,
        risk_level: c.risk_level,
        explanation: c.explanation,
        original_text: c.original_text,
        risk_score: c.risk_score,
      }));
      this.clauses.push(...newClauses);
      return { count: newClauses.length };
    },
    findMany: async ({ where }: any) => {
      return this.clauses.filter(c => c.analysis_id === where.analysis_id);
    }
  };

  public chatSession = {
    create: async ({ data }: any) => {
      const cs = {
        id: data.id || "mock-chat-session-uuid-" + Date.now(),
        document_id: data.document_id,
        created_at: new Date(),
      };
      this.chatSessions.push(cs);
      return cs;
    },
    findUnique: async ({ where, include }: any) => {
      const cs = this.chatSessions.find(s => s.id === where.id);
      if (!cs) return null;
      const copy = { ...cs };
      if (include && include.document) {
        copy.document = this.documents.find(d => d.id === cs.document_id);
      }
      return copy;
    },
    findFirst: async ({ where, include }: any) => {
      const cs = this.chatSessions.find(s => s.id === where.id || s.document_id === where.document_id);
      if (!cs) return null;
      const copy = { ...cs };
      if (include && include.document) {
        copy.document = this.documents.find(d => d.id === cs.document_id);
      }
      return copy;
    },
    findMany: async ({ where, include }: any) => {
      const filtered = this.chatSessions.filter(s => s.document_id === where.document_id);
      return filtered.map(s => {
        const copy = { ...s };
        if (include && include.messages) {
          copy.messages = this.messages.filter(m => m.chat_session_id === s.id);
        }
        return copy;
      });
    }
  };

  public message = {
    create: async ({ data }: any) => {
      const msg = {
        id: data.id || "mock-message-uuid-" + Date.now(),
        chat_session_id: data.chat_session_id,
        sender: data.sender,
        content: data.content,
        created_at: new Date(),
      };
      this.messages.push(msg);
      return msg;
    },
    findMany: async ({ where, orderBy }: any) => {
      let filtered = this.messages.filter(m => m.chat_session_id === where.chat_session_id);
      filtered.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
      return filtered;
    },
    findFirst: async ({ where, orderBy }: any) => {
      let filtered = this.messages.filter(m => m.chat_session_id === where.chat_session_id);
      if (where.sender) {
        filtered = filtered.filter(m => m.sender === where.sender);
      }
      if (orderBy && orderBy.created_at === "desc") {
        filtered.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      } else {
        filtered.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
      }
      return filtered[0] || null;
    }
  };

  public contractDate = {
    create: async ({ data }: any) => {
      const cd = {
        id: data.id || "mock-cd-uuid-" + Date.now(),
        doc_id: data.doc_id,
        date_type: data.date_type,
        raw_text: data.raw_text,
        resolved_date: data.resolved_date,
        confidence: data.confidence ?? 1.0,
        clause_id: data.clause_id || null,
        user_confirmed: data.user_confirmed ?? false,
        is_active: data.is_active ?? true,
        created_at: new Date(),
      };
      this.contractDates.push(cd);
      return cd;
    },
    findMany: async ({ where, include, orderBy }: any) => {
      let filtered = this.contractDates.filter(cd => cd.doc_id === where.doc_id && (where.is_active === undefined || cd.is_active === where.is_active));
      return filtered.map(cd => {
        const copy = { ...cd };
        if (include && include.reminders) {
          copy.reminders = this.reminders.filter(r => r.contract_date_id === cd.id);
        }
        return copy;
      });
    },
    findUnique: async ({ where, include }: any) => {
      const cd = this.contractDates.find(item => item.id === where.id);
      if (!cd) return null;
      const copy = { ...cd };
      if (include && include.reminders) {
        copy.reminders = this.reminders.filter(r => r.contract_date_id === cd.id);
      }
      return copy;
    }
  };

  public reminder = {
    create: async ({ data }: any) => {
      const rem = {
        id: data.id || "mock-reminder-uuid-" + Date.now(),
        user_id: data.user_id,
        contract_date_id: data.contract_date_id,
        days_before: data.days_before,
        scheduled_for: data.scheduled_for,
        status: data.status || "pending",
        channel: data.channel || "email",
        sent_at: null,
        snoozed_until: null,
        created_at: new Date(),
      };
      this.reminders.push(rem);
      return rem;
    },
    findMany: async ({ where, include }: any) => {
      let filtered = this.reminders.filter(r => {
        if (where.user_id && r.user_id !== where.user_id) return false;
        if (where.status && typeof where.status === "string" && r.status !== where.status) return false;
        if (where.status && typeof where.status === "object" && where.status.lte && r.status === "pending" && r.scheduled_for > where.status.lte) return false;
        if (where.channel && r.channel !== where.channel) return false;
        return true;
      });
      return filtered.map(r => {
        const copy = { ...r };
        if (include && include.contract_date) {
          const cd = this.contractDates.find(c => c.id === r.contract_date_id);
          if (cd) {
            const cdCopy = { ...cd };
            if (include.contract_date.include && include.contract_date.include.document) {
              cdCopy.document = this.documents.find(d => d.id === cd.doc_id);
            }
            copy.contract_date = cdCopy;
          }
        }
        if (include && include.user) {
          copy.user = this.users.find(u => u.id === r.user_id);
        }
        return copy;
      });
    },
    findFirst: async ({ where }: any) => {
      return this.reminders.find(r => r.id === where.id && (where.user_id ? r.user_id === where.user_id : true)) || null;
    },
    update: async ({ where, data, include }: any) => {
      const rem = this.reminders.find(r => r.id === where.id);
      if (rem) {
        Object.assign(rem, data);
        const copy = { ...rem };
        if (include && include.contract_date) {
          copy.contract_date = this.contractDates.find(c => c.id === rem.contract_date_id);
        }
        return copy;
      }
      throw new Error("Reminder not found");
    }
  };

  public notificationPreferences = {
    create: async ({ data }: any) => {
      const np = {
        id: data.id || "mock-np-uuid-" + Date.now(),
        user_id: data.user_id,
        email_enabled: data.email_enabled ?? true,
        push_enabled: data.push_enabled ?? true,
        sms_enabled: data.sms_enabled ?? false,
        phone_number: data.phone_number || null,
        fcm_token: data.fcm_token || null,
        reminder_days: data.reminder_days || [30, 7, 1],
        rescan_notify: data.rescan_notify ?? true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.notificationPreferencesList.push(np);
      return np;
    },
    findFirst: async ({ where }: any) => {
      return this.notificationPreferencesList.find(p => p.user_id === where.user_id || p.id === where.id) || null;
    },
    update: async ({ where, data }: any) => {
      const p = this.notificationPreferencesList.find(item => item.id === where.id || item.user_id === where.user_id);
      if (p) {
        Object.assign(p, data, { updated_at: new Date() });
        return p;
      }
      throw new Error("NotificationPreferences not found");
    }
  };

  public $disconnect = async () => {};
}

export const prisma = isMock
  ? (globalForPrisma.prisma || new MockPrisma())
  : (globalForPrisma.prisma || new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"] }));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
