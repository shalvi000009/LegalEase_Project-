export interface Citation {
  clauseId: string;
  page?: number;
  text: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
}

export interface ChatSession {
  docId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  docId: string;
  message: string;
}

export interface StreamChunk {
  token?: string;
  chunk?: string;
  done?: boolean;
  citations?: Citation[];
  error?: string;
}
