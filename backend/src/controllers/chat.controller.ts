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

      const message = await prisma.message.create({
        data: {
          chat_session_id: sessionId,
          sender: "user",
          content: content.trim(),
        },
      });

      res.status(201).json({
        message: {
          id: message.id,
          sender: message.sender,
          content: message.content,
          created_at: message.created_at,
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

      // 2. Select legal-themed response based on keywords
      const promptLower = userPrompt.toLowerCase();
      let aiResponseText = "";

      if (promptLower.includes("liability") || promptLower.includes("limit") || promptLower.includes("cap")) {
        aiResponseText = "Based on Section 8 of the contract, the limitation of liability is capped at the total fees paid by the client in the 12 months preceding the claim. However, there is an exclusion for breaches of confidentiality and intellectual property rights, where liability remains uncapped.";
      } else if (promptLower.includes("termination") || promptLower.includes("terminate") || promptLower.includes("convenience")) {
        aiResponseText = "According to Section 11, either party may terminate this agreement for convenience upon 30 days prior written notice. If a party is in material breach, the non-breaching party can terminate immediately if the breach is not cured within 15 days of notice.";
      } else if (promptLower.includes("indemnity") || promptLower.includes("indemnification") || promptLower.includes("harmers")) {
        aiResponseText = "The indemnification terms in Section 9 state that the Provider will defend and hold the Customer harmless from any third-party claims alleging that the software infringes any patent, copyright, or trade secret. The Customer must provide prompt written notice of any claim.";
      } else if (promptLower.includes("governing") || promptLower.includes("law") || promptLower.includes("jurisdiction")) {
        aiResponseText = "This agreement is governed by the laws of the State of New York, excluding its conflict of laws principles. Any legal actions or proceedings arising under this contract must be brought exclusively in the state or federal courts located in New York County.";
      } else if (promptLower.includes("confidential") || promptLower.includes("secret") || promptLower.includes("disclosure")) {
        aiResponseText = "Section 5 defines Confidential Information broadly. The receiving party agrees to maintain confidentiality for a period of 5 years following termination of the agreement. Standard exceptions apply, such as information that is already public.";
      } else {
        aiResponseText = "Thank you for your question about the contract. Based on my legal analysis, this agreement contains standard commercial terms. Please refer to the specific clauses in the results view to inspect the risk levels and matching rules associated with this topic.";
      }

      // TODO: BLOCKED on Rishi's RAG chain microservice.
      // Once Rishi's FastAPI streaming RAG endpoint is ready (e.g. POST /api/v1/chat/stream),
      // replace this mock block with a real HTTP fetch stream proxy:
      //
      // const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
      // const response = await fetch(`${aiServiceUrl}/api/v1/chat/stream`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     doc_id: session.document_id,
      //     message: userPrompt,
      //     history: [] // Add message history here
      //   })
      // });
      // const reader = response.body.getReader();
      // ... read stream chunks and proxy to client ...

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
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        }

        const token = words[currentIndex];
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
        currentIndex++;
      }, 50);

      // Handle client disconnect / closed connection
      req.on("close", () => {
        clearInterval(streamInterval);
      });
    } catch (error) {
      next(error);
    }
  }
}
