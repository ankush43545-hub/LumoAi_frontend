import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { useTheme } from "@/components/theme-provider";
import {
  sendChatMessage,
  getMessages,
  clearConversation,
  createConversation,
  getConversations,
  getModeLabel,
} from "@/lib/chat-api";
import type { Message, Conversation } from "@shared/schema";
import { Copy, Moon, Sun, Send } from "lucide-react";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<string>("default");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ["/api/messages", conversationId],
    queryFn: () => (conversationId ? getMessages(conversationId) : Promise.resolve([])),
    enabled: !!conversationId,
  });

  // Generate a summary title from content
  const generateChatTitle = (content: string): string => {
    const maxLength = 50;
    const summary = content.length > maxLength ? content.substring(0, maxLength) + "..." : content;
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${summary} - ${date}`;
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => {
      if (!conversationId) {
        return createConversation(aiMode, generateChatTitle(content)).then((conv) => {
          setConversationId(conv.id);
          return sendChatMessage(conv.id, content, aiMode);
        });
      }
      return sendChatMessage(conversationId, content, aiMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessageMutation.isPending]);

  // Handle textarea auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setMessage(textarea.value);

    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate(trimmedMessage);
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied",
        description: "Message copied to clipboard.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy message.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between max-w-full mx-auto">
          <h1 className="text-2xl font-semibold text-foreground">LumoAI</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden flex flex-col px-6 py-6 w-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Start a Conversation
                </h2>
                <p className="text-sm text-muted-foreground">
                  Type your message to start chat with Lumo
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${msg.role}-${msg.id}`}
                >
                  <div className="max-w-[70%]">
                    {msg.role === "user" ? (
                      <div>
                        <div className="bg-black border border-white rounded-2xl px-4 py-3">
                          <p
                            className="text-sm leading-relaxed whitespace-pre-wrap text-white"
                            data-testid={`text-user-message-${msg.id}`}
                          >
                            {msg.content}
                          </p>
                        </div>
                        <div className="flex justify-end mt-1 px-1">
                          <span
                            className="text-xs text-muted-foreground"
                            data-testid={`timestamp-${msg.id}`}
                          >
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="bg-muted rounded-2xl px-4 py-3">
                          <p
                            className="text-sm leading-relaxed whitespace-pre-wrap"
                            data-testid={`text-ai-message-${msg.id}`}
                          >
                            {msg.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <span
                            className="text-xs text-muted-foreground"
                            data-testid={`timestamp-${msg.id}`}
                          >
                            {formatTime(msg.timestamp)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => copyMessage(msg.content)}
                            data-testid={`button-copy-${msg.id}`}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {sendMessageMutation.isPending && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex gap-3 pt-4">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="resize-none"
            rows={3}
            data-testid="input-message"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="icon"
            className="h-auto"
            data-testid="button-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
  }
