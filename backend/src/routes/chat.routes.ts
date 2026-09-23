import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * @openapi
 * /api/v1/chat/sessions:
 *   post:
 *     summary: Create a new chat session scoped to a document
 *     description: Creates a session for conversing with the RAG assistant about a specific document.
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentId
 *             properties:
 *               documentId:
 *                 type: string
 *                 format: uuid
 *                 description: Unique identifier of the analyzed document
 *     responses:
 *       201:
 *         description: Chat session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Chat session created successfully."
 *                 session:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "session-uuid-1234"
 *                     document_id:
 *                       type: string
 *                       format: uuid
 *                       example: "document-uuid-5678"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-08-03T12:00:00.000Z"
 *       400:
 *         description: Invalid inputs (e.g. documentId missing)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Document not found or access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/sessions", requireAuth, ChatController.createChatSession);

/**
 * @openapi
 * /api/v1/chat/sessions/{id}/messages:
 *   get:
 *     summary: Retrieve history of messages in a session
 *     description: Returns a sorted list of all user and AI messages in a chat session.
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique chat session ID
 *     responses:
 *       200:
 *         description: Message history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "msg-uuid-999"
 *                       sender:
 *                         type: string
 *                         enum: [user, ai]
 *                         example: "user"
 *                       content:
 *                         type: string
 *                         example: "What is the limitation of liability?"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-08-03T12:01:00.000Z"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat session not found or access denied
 */
router.get("/sessions/:id/messages", requireAuth, ChatController.getSessionMessages);

/**
 * @openapi
 * /api/v1/chat/sessions/{id}/messages:
 *   post:
 *     summary: Send a user message to a chat session
 *     description: Saves a user message in the database for the given session.
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique chat session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: User message content
 *                 example: "What are the termination terms?"
 *     responses:
 *       201:
 *         description: Message saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     sender:
 *                       type: string
 *                       example: "user"
 *                     content:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input (empty content)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat session not found or access denied
 */
router.post("/sessions/:id/messages", requireAuth, ChatController.createMessage);

/**
 * @openapi
 * /api/v1/chat/sessions/{id}/stream:
 *   get:
 *     summary: Get AI response token-by-token stream (Server-Sent Events)
 *     description: Streams the AI RAG model response for the chat session. This returns a text/event-stream containing SSE data packets, not a JSON response.
 *     tags:
 *       - Chat
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique chat session ID
 *       - in: query
 *         name: message
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional new message content from the user (if provided, saves the user message to DB before streaming)
 *     responses:
 *       200:
 *         description: Connection established successfully. Streams SSE event chunks.
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *               example: text/event-stream
 *           Cache-Control:
 *             schema:
 *               type: string
 *               example: no-cache
 *           Connection:
 *             schema:
 *               type: string
 *               example: keep-alive
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: |
 *                 Server-Sent Event packets formatted as:
 *                 `data: {"token": "next_word"}\n\n`
 *                 
 *                 Stream termination packet formatted as:
 *                 `data: [DONE]\n\n`
 *       400:
 *         description: Missing user prompt in history or request query parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat session not found or access denied
 */
router.get("/sessions/:id/stream", requireAuth, ChatController.streamChatResponse);

export default router;
