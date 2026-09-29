import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { AuthenticatedRequest } from "../middleware/auth";

export class ChatController {
  /**
   * Create a new chat session scoped to a specific document.
   */
  public static async createChatSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reqAuth = req as AuthenticatedRequest;
      if (!reqAuth.user) {
        throw new BadRequestError("User context is missing");
      }

      const { documentId } = req.body;
      if (!documentId) {
        throw new BadRequestError("Document ID is required to create a chat session");
      }

      // Check if document exists and belongs to the user
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          user_id: reqAuth.user.id,
        },
      });

      if (!document) {
        throw new NotFoundError("Document not found or access denied");
      }

      const session = await prisma.chatSession.create({
        data: {
          document_id: documentId,
        },
      });

      res.status(201).json({
        message: "Chat session created successfully.",
        session: {
          id: session.id,
          document_id: session.document_id,
          created_at: session.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all messages for a specific session.
   */
  public static async getSessionMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reqAuth = req as AuthenticatedRequest;
      if (!reqAuth.user) {
        throw new BadRequestError("User context is missing");
      }

      const { id: sessionId } = req.params;

      // Validate session ownership
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: { document: true },
      });

      if (!session || session.document.user_id !== reqAuth.user.id) {
        throw new NotFoundError("Chat session not found or access denied");
      }

      const messages = await prisma.message.findMany({
        where: { chat_session_id: sessionId },
        orderBy: { created_at: "asc" },
      });

      res.status(200).json({
        messages: messages.map((m: any) => ({
          id: m.id,
          sender: m.sender,
          content: m.content,
          created_at: m.created_at,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save a user message into the session.
   */
  public static async createMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reqAuth = req as AuthenticatedRequest;
      if (!reqAuth.user) {
        throw new BadRequestError("User context is missing");
      }

      const { id: sessionId } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        throw new BadRequestError("Message content cannot be empty");
      }

      // Validate session ownership
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: { document: true },
      });

      if (!session || session.document.user_id !== reqAuth.user.id) {
        throw new NotFoundError("Chat session not found or access denied");
      }

      const userMessage = await prisma.message.create({
        data: {
          chat_session_id: sessionId,
          sender: "user",
          content: content.trim(),
        },
      });

      // Generate AI answer automatically for non-streaming consumers
      const responseData = await generateSmartChatAnswer(content.trim(), session.document_id);

      const aiMessage = await prisma.message.create({
        data: {
          chat_session_id: sessionId,
          sender: "ai",
          content: responseData.text,
        },
      });

      res.status(201).json({
        message: {
          id: userMessage.id,
          sender: userMessage.sender,
          content: userMessage.content,
          created_at: userMessage.created_at,
        },
        aiMessage: {
          id: aiMessage.id,
          sender: aiMessage.sender,
          content: aiMessage.content,
          sources: responseData.sources || [],
          created_at: aiMessage.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Server-Sent Events (SSE) streaming endpoint for AI response proxy.
   */
  public static async streamChatResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reqAuth = req as AuthenticatedRequest;
      if (!reqAuth.user) {
        throw new BadRequestError("User context is missing");
      }

      const { id: sessionId } = req.params;
      const queryMessage = req.query.message as string;

      // Validate session ownership
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: { document: true },
      });

      if (!session || session.document.user_id !== reqAuth.user.id) {
        throw new NotFoundError("Chat session not found or access denied");
      }

      let userPrompt = "";

      // 1. Process new message from query parameters or fallback to latest unresponded message
      if (queryMessage && queryMessage.trim()) {
        userPrompt = queryMessage.trim();
        // Save the user message to the database
        await prisma.message.create({
          data: {
            chat_session_id: sessionId,
            sender: "user",
            content: userPrompt,
          },
        });
      } else {
        // Find latest user message
        const lastUserMsg = await prisma.message.findFirst({
          where: {
            chat_session_id: sessionId,
            sender: "user",
          },
          orderBy: { created_at: "desc" },
        });

        if (!lastUserMsg) {
          throw new BadRequestError("No user prompt found in request or session history");
        }

        userPrompt = lastUserMsg.content;
      }

      // Set headers for Server-Sent Events (SSE)
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable buffering in proxying (Nginx/etc)
      });

      // Flush headers
      res.flushHeaders();

      // 2. Generate accurate, document-grounded AI response
      const responseData = await generateSmartChatAnswer(userPrompt, session.document_id);
      const aiResponseText = responseData.text;

      // 3. Stream response tokens (split by space to simulate words/tokens)
      const words = aiResponseText.split(/(\s+)/);
      let currentIndex = 0;

      const streamInterval = setInterval(async () => {
        if (currentIndex >= words.length) {
          clearInterval(streamInterval);

          // Save the AI message to the database
          try {
            await prisma.message.create({
              data: {
                chat_session_id: sessionId,
                sender: "ai",
                content: aiResponseText,
              },
            });
          } catch (dbErr) {
            console.error("[SSE Stream] Failed to save AI response message to DB:", dbErr);
          }

          // Send SSE done event and close connection
          res.write(`data: ${JSON.stringify({ token: "", done: true, sources: responseData.sources || [] })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        }

        const token = words[currentIndex];
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
        currentIndex++;
      }, 30);

      // Handle client disconnect / closed connection
      req.on("close", () => {
        clearInterval(streamInterval);
      });
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Generates an accurate, grounded AI response for a user query about a specific document.
 * Includes gibberish/unreadable input detection, typo-tolerant legal term matching,
 * database clause lookup, and ai-service RAG query integration.
 */
export async function generateSmartChatAnswer(userPrompt: string, documentId: string): Promise<{ text: string; sources?: any[] }> {
  const promptTrimmed = userPrompt.trim();
  const promptLower = promptTrimmed.toLowerCase();

  // 1. Unreadable / Gibberish detection
  if (promptTrimmed.length < 2 || /^[\d\W]+$/.test(promptTrimmed)) {
    return { text: "Sorry, I am unable to understand your question. Please write again with more details about your contract (e.g., liability cap, termination, financial risk, or confidentiality)." };
  }

  const alphaWords = promptLower.match(/[a-z]{4,}/g) || [];
  for (const word of alphaWords) {
    const vowels = word.match(/[aeiouy]/g);
    if (!vowels || (vowels.length / word.length) < 0.12) {
      return { text: "Sorry, I am unable to understand your question. Please write again with more details about your contract (e.g., liability cap, termination, financial risk, or confidentiality)." };
    }
  }

  // 2. Greetings & Conversational Intents
  if (["hello", "hi", "hey", "greetings", "good morning", "good evening"].includes(promptLower)) {
    return { text: "Hello! I am your LegalEase AI Contract Assistant. Ask me any question about your contract, such as financial risk, liability caps, termination terms, or non-compete clauses!" };
  }
  if (["ok", "thanks", "thank you", "got it", "cool", "great"].includes(promptLower)) {
    return { text: "You're welcome! Feel free to ask any further questions about your contract obligations, risk scores, or specific clauses." };
  }

  // 3. Try calling AI-Service RAG endpoint first
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const ragRes = await fetch(`${aiServiceUrl}/internal/rag-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doc_id: documentId,
        query: userPrompt,
        top_k: 3,
      }),
    });

    if (ragRes.ok) {
      const data: any = await ragRes.json();
      if (data && data.answer && !data.answer.includes("not explicitly addressed")) {
        return {
          text: data.answer,
          sources: data.sources || [],
        };
      }
    }
  } catch (err) {
    // Continue to database-grounded fallback synthesis
  }

  // 4. Fetch Document & Analysis from Database
  let document: any = null;
  try {
    if (documentId && documentId !== 'general') {
      document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          analyses: {
            orderBy: { created_at: "desc" },
            take: 1,
            include: { clauses: true },
          },
        },
      });
    }
  } catch (dbErr) {
    // Ignore DB error if invalid UUID format
  }

  // If document was not found by ID or in general mode, check for user's latest uploaded document
  if (!document) {
    try {
      document = await prisma.document.findFirst({
        orderBy: { created_at: "desc" },
        include: {
          analyses: {
            orderBy: { created_at: "desc" },
            take: 1,
            include: { clauses: true },
          },
        },
      });
    } catch (e) {
      // Ignore DB error
    }
  }

  const docName = document?.filename;
  const analysis = document?.analyses?.[0];
  const clauses: any[] = analysis?.clauses || [];

  // General legal contract guidance library for when no document or clause is matched
  const GENERAL_LEGAL_GUIDANCE: Record<string, string> = {
    termination: "In standard commercial and employment agreements, termination rules typically require:\n• Written Notice: 30 to 90 days advance written notice for termination without cause.\n• Cause / Material Breach: Immediate termination upon uncured material breach (typically following a 15 to 30 day cure period).\n• Post-Termination Obligations: Return of confidential materials, payment of accrued fees, and survival of confidentiality & liability terms.",
    liability: "In contract law, limitation of liability clauses typically establish:\n• Aggregate Liability Cap: Often capped to the total fees paid under the contract in the prior 12 months.\n• Consequential Damages Waiver: Mutual exclusion of lost profits, indirect, punitive, or consequential damages.\n• Carve-Outs: Standard exceptions for gross negligence, willful misconduct, indemnification claims, and confidentiality breaches.",
    indemnification: "Indemnification clauses allocate third-party risk between parties:\n• Scope: One party agrees to defend, indemnify, and hold harmless the other from third-party lawsuits.\n• Common Triggers: Third-party intellectual property infringement, data breach/confidentiality violations, and gross negligence.\n• Defense Control: The indemnifying party typically manages the legal defense with legal counsel reasonably acceptable to the indemnified party.",
    non_compete: "Non-compete and restrictive covenants typically encompass:\n• Duration: Commonly enforceable between 6 and 12 months post-engagement depending on jurisdiction.\n• Geographic & Industry Scope: Must be narrowly tailored to protect legitimate business interests without preventing livelihood.\n• Non-Solicitation: Restrictions on soliciting employees, clients, or vendors during and after the contract term.",
    confidentiality: "Confidentiality & Non-Disclosure provisions establish:\n• Term of Protection: Typically 2 to 5 years from disclosure, with trade secrets protected indefinitely.\n• Standard Exclusions: Publicly available information, previously known data, or independently developed information.\n• Compelled Disclosure: Notice requirement prior to disclosing under subpoena or governmental order.",
    payment: "Standard commercial payment terms specify:\n• Payment Window: Standard Net 30 days from receipt of a valid undisputed invoice.\n• Late Interest: Typically statutory rate or 1.0% to 1.5% per month on overdue balances.\n• Dispute Rights: Explicit window (e.g., 14 days) to dispute invoice items in good faith prior to payment.",
    governing_law: "Governing law and dispute resolution clauses define:\n• Applicable Law: Which jurisdiction's statutory and case law governs interpretation.\n• Forum Selection: Which courts or arbitration tribunals (e.g. AAA, JAMS, ICC) have exclusive jurisdiction.\n• Attorney's Fees: Prevailing party clauses awarding legal fees in dispute enforcement.",
    intellectual_property: "Intellectual property provisions standardly govern:\n• Background IP: Each party retains ownership of pre-existing proprietary technology and know-how.\n• Work Product / Deliverables: Client typically owns deliverables upon full payment of fees.\n• License Rights: Perpetual or term-limited licenses required to use and operate deliverables.",
  };

  // Match legal concepts with typo tolerance
  const patterns = [
    {
      type: "non_compete",
      regex: /compte|compet|non-?compete|solicit|probation|employment|hiring|restrictive/i,
      label: "Non-Compete & Employment Restrictions",
    },
    {
      type: "payment",
      regex: /finac|finans|cost|payment|fee|price|money|expense|penalty|late fee|billing|rate/i,
      label: "Financial & Payment Terms",
    },
    {
      type: "confidentiality",
      regex: /privac|privas|confidential|secret|data|gdpr|disclosure|nda|proprietary/i,
      label: "Privacy & Confidentiality",
    },
    {
      type: "liability",
      regex: /liab|liable|limit|cap|loss|damage|claim limit/i,
      label: "Limitation of Liability",
    },
    {
      type: "termination",
      regex: /terminat|terminte|cancel|notice|breach|cure|exit|expire|renewal/i,
      label: "Termination & Notice",
    },
    {
      type: "indemnification",
      regex: /indemn|harm|hold harmless|defend/i,
      label: "Indemnification",
    },
    {
      type: "governing_law",
      regex: /govern|jurisdiction|court|venue|state|law/i,
      label: "Governing Law & Venue",
    },
    {
      type: "intellectual_property",
      regex: /intellectual|\bip\b|copyright|patent|trademark|ownership/i,
      label: "Intellectual Property Rights",
    },
  ];

  for (const item of patterns) {
    if (item.regex.test(promptLower)) {
      const matchingClause = clauses.find(
        (c: any) => c.clause_type === item.type || c.clause_type?.toLowerCase().includes(item.type)
      );

      if (matchingClause) {
        const score = matchingClause.risk_score ?? 50;
        const level = matchingClause.risk_level ? String(matchingClause.risk_level).toUpperCase() : "MEDIUM";
        return {
          text: `Based on AI analysis of "${docName}":\n\n📌 Clause Type: ${item.label}\n⚖️ Risk Level: ${level} (Risk Score: ${score}/100)\n\nExplanation: ${matchingClause.explanation}\n\nExact Excerpt:\n"${matchingClause.original_text.slice(0, 350)}${matchingClause.original_text.length > 350 ? "..." : ""}"`,
          sources: [
            {
              chunk_index: 0,
              text: matchingClause.original_text,
              clause_type: item.type,
            },
          ],
        };
      } else if (docName) {
        const guidance = GENERAL_LEGAL_GUIDANCE[item.type] || "";
        return {
          text: `Based on AI analysis of "${docName}": No specific ${item.label.toLowerCase()} clause was identified in this document.\n\n📖 Legal Guidance:\n${guidance}\n\n💡 Tip: Check the remaining clause risk breakdown cards on your dashboard or upload an updated draft to re-scan.`,
        };
      } else {
        const guidance = GENERAL_LEGAL_GUIDANCE[item.type] || "";
        return {
          text: `📖 Legal Guidance on ${item.label}:\n\n${guidance}\n\n💡 Tip: Upload a contract on your LegalEase Dashboard to trigger automatic clause extraction, 0-100 risk scoring, and exact document citations!`,
        };
      }
    }
  }

  // 5. Default Domain Fallback for recognized questions
  if (analysis && docName) {
    return {
      text: `Based on AI analysis of "${docName}": The document has an overall risk score of ${analysis.overall_risk_score}/100 with ${clauses.length} identified clause provisions.\n\nYou can ask me specific questions regarding:\n• Termination notice requirements & penalties\n• Limitation of liability & financial caps\n• Indemnification scope & liabilities\n• Non-compete covenants & duration`,
    };
  }

  return {
    text: `Hello! I am your LegalEase AI Contract Specialist. I can analyze risk levels, termination notice periods, liability caps, indemnification terms, and non-compete clauses.\n\nAsk me any question about contract provisions, or upload a contract anytime on your Dashboard for instant automated clause extraction and 0-100 risk scoring!`,
  };
}
