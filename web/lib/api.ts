"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Types ───────────────────────────────────────────────

export interface Repo {
  repo_id: string;
  repo_name: string;
  collection_name: string;
  chunk_count?: number;
}

export interface Conversation {
  id: number;
  repo_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface Chunk {
  file_path: string;
  start_line: number;
  end_line: number;
  name: string;
  chunk_type: string;
  content?: string;
}

export interface ChatResponse {
  answer: string;
  chunks: Chunk[];
  conversation_id: number;
}

export interface IndexingStatus {
  repo_id: string;
  stage: "cloning" | "parsing" | "embedding" | "complete" | "error";
  percent: number;
  files_processed: number;
  chunks_generated: number;
  message: string;
  error?: string;
}

export interface StreamToken {
  type: "token";
  content: string;
}

export interface StreamDone {
  type: "done";
  content: string;
  chunks: Chunk[];
  conversation_id: number;
}

export interface StreamError {
  type: "error";
  content: string;
}

export type StreamEvent = StreamToken | StreamDone | StreamError;

// ─── Repos ───────────────────────────────────────────────

export async function listRepos(): Promise<Repo[]> {
  return fetchApi("/repos");
}

export async function indexRepo(url: string): Promise<{ repo_id: string; repo_name: string }> {
  return fetchApi("/index", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function deleteRepo(repoId: string): Promise<void> {
  await fetchApi(`/repos/${repoId}`, { method: "DELETE" });
}

export async function updateRepo(repoId: string): Promise<void> {
  await fetchApi(`/repos/${repoId}/update`, { method: "POST" });
}

export async function getIndexingStatus(repoId: string): Promise<IndexingStatus> {
  return fetchApi(`/index/${repoId}/status`);
}

// ─── Conversations ───────────────────────────────────────

export async function listConversations(repoId?: string): Promise<Conversation[]> {
  const params = repoId ? `?repo_id=${repoId}` : "";
  return fetchApi(`/conversations${params}`);
}

export async function createConversation(repoId: string, title?: string): Promise<Conversation> {
  return fetchApi("/conversations", {
    method: "POST",
    body: JSON.stringify({ repo_id: repoId, title }),
  });
}

export async function getConversation(id: number): Promise<{
  conversation: Conversation;
  messages: Message[];
}> {
  return fetchApi(`/conversations/${id}`);
}

export async function deleteConversation(id: number): Promise<void> {
  await fetchApi(`/conversations/${id}`, { method: "DELETE" });
}

export async function getMessages(id: number): Promise<Message[]> {
  const { messages } = await getConversation(id);
  return messages;
}

// ─── Chat ────────────────────────────────────────────────

export async function sendMessage(
  repoId: string,
  query: string,
  conversationId: number
): Promise<ChatResponse> {
  return fetchApi("/chat", {
    method: "POST",
    body: JSON.stringify({
      repo_id: repoId,
      query,
      conversation_id: conversationId,
    }),
  });
}

export function streamMessage(
  repoId: string,
  query: string,
  conversationId: number,
  onEvent: (event: StreamEvent) => void,
  onError?: (error: Error) => void
): () => void {
  const abortController = new AbortController();

  fetch(`${API_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo_id: repoId,
      query,
      conversation_id: conversationId,
    }),
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              onEvent(event);
            } catch (e) {
              console.error("Failed to parse SSE event:", line);
            }
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== "AbortError") {
        onError?.(error);
      }
    });

  return () => abortController.abort();
}