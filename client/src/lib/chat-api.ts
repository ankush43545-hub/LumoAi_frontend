import { apiRequest } from "./queryClient";
import type { Message, Conversation } from "@shared/schema";

export interface ChatResponse {
  userMessage: Message;
  aiMessage: Message;
}

export async function sendChatMessage(
  conversationId: string,
  content: string,
  mode: string
): Promise<ChatResponse> {
  const response = await apiRequest("POST", `/api/chat/${conversationId}?mode=${mode}`, {
    content,
    role: "user",
  });
  return response.json();
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const response = await apiRequest("GET", `/api/messages/${conversationId}`);
  return response.json();
}

export async function clearConversation(conversationId: string): Promise<void> {
  await apiRequest("DELETE", `/api/conversation/${conversationId}`);
}

export async function createConversation(mode: string, title?: string): Promise<Conversation> {
  const response = await apiRequest("POST", "/api/conversations", {
    mode,
    title: title || `${getModeLabel(mode)} - ${new Date().toLocaleDateString()}`,
  });
  return response.json();
}

export async function getConversations(): Promise<Conversation[]> {
  const response = await apiRequest("GET", "/api/conversations");
  return response.json();
}

export function getModeLabel(mode: string): string {
  switch (mode) {
    case "default":
      return "Chat";
    case "image":
      return "Image Generation";
    case "calculation":
      return "Calculator";
    case "study":
      return "Study";
    default:
      return "Chat";
  }
}
