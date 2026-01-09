"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { VoiceInput, VoiceInputRef } from "./VoiceInput";
import { QuickActions } from "./QuickActions";

interface MessageToolCall {
  name: string;
  friendlyName: string;
  icon: string;
  input?: Record<string, unknown>;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: string[]; // base64 image previews for display
  imagePaths?: string[]; // paths to temp files for multi-turn access
  toolCalls?: MessageToolCall[]; // tool calls made for this response
}

interface SelectedImage {
  file: File;
  preview: string; // base64 data URL for preview
}

interface ToolCall {
  name: string;
  friendlyName: string;
  icon: string;
  input?: Record<string, unknown>;
  timestamp: number;
}

// Get friendly display name for MCP servers/plugins
function getMcpDisplayName(server: string): string {
  // Handle playwright plugin (various formats)
  if (server.toLowerCase().includes("playwright")) {
    return "Internet Access";
  }
  // Direct mappings for MCP servers
  const mappings: Record<string, string> = {
    "gmail": "Gmail",
    "calendar": "Google Calendar",
  };
  return mappings[server] || server;
}

// SSE event types (matching backend)
interface ToolCallEvent {
  type: "tool";
  name: string;
  friendlyName: string;
  input?: Record<string, unknown>;
  icon: string;
}

interface DoneEvent {
  type: "done";
  content: string;
  imagePaths?: string[]; // paths to uploaded images for multi-turn access
}

interface ErrorEvent {
  type: "error";
  message: string;
}

interface InitEvent {
  type: "init";
  tools: string[];
  mcpServers: string[];
}

type StreamEvent = ToolCallEvent | DoneEvent | ErrorEvent | InitEvent;

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [connectedServers, setConnectedServers] = useState<string[]>([]);
  const [updateMode, setUpdateMode] = useState(false);
  const [foodMode, setFoodMode] = useState(false);
  const [animeMode, setAnimeMode] = useState(false);
  const [reminderMode, setReminderMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voiceRef = useRef<VoiceInputRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, toolCalls]);

  // Handle image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxImages = 10;
    const maxSize = 10 * 1024 * 1024; // 10MB per image

    Array.from(files).forEach((file) => {
      if (selectedImages.length >= maxImages) return;
      if (!file.type.startsWith("image/")) return;
      if (file.size > maxSize) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        setSelectedImages((prev) => {
          if (prev.length >= maxImages) return prev;
          return [...prev, { file, preview }];
        });
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  // Handle camera capture for food mode
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageSelect(e);
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 100);
  };

  // Remove a selected image
  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async (content: string, actionType: string = "default") => {
    if ((!content.trim() && selectedImages.length === 0) || isLoading) return;

    // Stop voice recognition if active
    voiceRef.current?.stop();

    // Check if we're in a special mode - prepend appropriate instructions
    const isUpdate = updateMode;
    const isFood = foodMode;
    const isAnime = animeMode;
    const isReminder = reminderMode;
    let messageToSend = content.trim();

    if (isAnime) {
      messageToSend = `[ANIME RECOMMENDATION - Read my anime preferences file at context/anime-preferences.md first.

The user said: "${content.trim()}"

Based on their message and preferences:
1. If they describe a mood or feeling, suggest 1-2 REWATCHES from their high-rated list that match
2. If they want something new, do a web search for "best new anime 2025 2026" and find 2-3 that match their taste (psychological depth, found family, beautiful animation, Studio Trigger, dark subversions)
3. If they just say "quick pick" or similar, give ONE immediate suggestion based on time of day
4. If they're providing feedback on an anime they watched, acknowledge it and offer to update their preferences file

Keep it concise and friendly. Don't overwhelm with options.]`;
    } else if (isFood) {
      messageToSend = `[FOOD LOG - Analyze this food and log it.

1. DISPLAY to me in this format:
   🍽️ Logged: [Food name]
   ~XXX cal | Xg protein | Xg carbs | Xg fat

2. SAVE to today's context/updates/YYYY-MM-DD.md file in a ## Food Log table:
   | Time | Food | Calories | Protein | Carbs | Fat | Notes |

3. SHOW running daily total if other meals logged today.

Use ~ for estimates. If uncertain about portion, give reasonable range. Don't ask clarifying questions unless completely unidentifiable.]

${content.trim()}`;
    } else if (isReminder) {
      messageToSend = `[SET REMINDER - Schedule a notification for me.

Parse my request and use the remind.sh script as documented in CLAUDE.md.

Time formats the 'at' command accepts:
- "3:00 PM" or "3pm" - today at that time
- "3:00 PM tomorrow" - tomorrow
- "3:00 PM Jan 15" - specific date
- Use --in "30 minutes" for relative times

After scheduling, confirm with:
⏰ Reminder set: [message]
📅 Scheduled for: [time]

If the time is ambiguous, ask for clarification.]

${content.trim()}`;
    } else if (isUpdate) {
      messageToSend = `[CONTEXT UPDATE - Save this immediately to context/updates/ with today's date. Do NOT ask questions, just save it and confirm briefly.]\n\n${content.trim()}`;
    }

    // Reset modes
    if (isUpdate) setUpdateMode(false);
    if (isFood) setFoodMode(false);
    if (isAnime) setAnimeMode(false);
    if (isReminder) setReminderMode(false);

    // Capture current images for display and sending
    const imagesToSend = selectedImages.map((img) => img.preview);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim() || (selectedImages.length > 0 ? `[${selectedImages.length} image(s) attached]` : ""),
      timestamp: new Date(),
      images: imagesToSend.length > 0 ? imagesToSend : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedImages([]);
    setToolCalls([]); // Clear previous tool calls
    setIsLoading(true);

    // Build conversation history for context (exclude the message we just added)
    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
      imagePaths: m.imagePaths,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          images: imagesToSend.length > 0 ? imagesToSend : undefined,
          conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      const collectedToolCalls: MessageToolCall[] = []; // Track tool calls for this response

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep incomplete message in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6)) as StreamEvent;

            if (data.type === "init") {
              // Store connected MCP servers
              setConnectedServers(data.mcpServers || []);
            } else if (data.type === "tool") {
              // Add tool call to display and collection
              const toolCall = {
                name: data.name,
                friendlyName: data.friendlyName,
                icon: data.icon,
                input: data.input,
              };
              collectedToolCalls.push(toolCall);
              setToolCalls((prev) => [
                ...prev,
                { ...toolCall, timestamp: Date.now() },
              ]);
            } else if (data.type === "done") {
              // If images were uploaded, update the last user message with imagePaths
              // Then add the assistant message
              setMessages((prev) => {
                const updated = [...prev];
                // Find the last user message and add imagePaths if returned
                if (data.imagePaths && data.imagePaths.length > 0) {
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].role === "user") {
                      updated[i] = { ...updated[i], imagePaths: data.imagePaths };
                      break;
                    }
                  }
                }
                // Add assistant message
                const assistantMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: "assistant",
                  content: data.content,
                  timestamp: new Date(),
                  toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
                };
                return [...updated, assistantMessage];
              });
              setIsLoading(false);
            } else if (data.type === "error") {
              const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.message,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, errorMessage]);
              setIsLoading(false);
            }
          } catch (parseError) {
            console.error("Failed to parse SSE event:", line);
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, there was an error connecting to the assistant. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleVoiceResult = (transcript: string) => {
    setInput(transcript);
    inputRef.current?.focus({ preventScroll: true });
  };

  // Prevent auto-scroll when focusing the input
  const handleInputFocus = () => {
    // Save current scroll position and restore it after browser tries to scroll
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      const scrollTop = scrollContainer.scrollTop;
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollTop;
      });
    }
  };

  const handleQuickAction = (prompt: string, actionType: string) => {
    if (actionType === "add_update") {
      setUpdateMode(true);
      setFoodMode(false);
      setAnimeMode(false);
      setReminderMode(false);
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    if (actionType === "add_food") {
      setFoodMode(true);
      setUpdateMode(false);
      setAnimeMode(false);
      setReminderMode(false);
      cameraInputRef.current?.click();
      return;
    }
    if (actionType === "set_reminder") {
      setReminderMode(true);
      setUpdateMode(false);
      setFoodMode(false);
      setAnimeMode(false);
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    if (actionType === "anime_recommendation") {
      setAnimeMode(true);
      setUpdateMode(false);
      setFoodMode(false);
      setReminderMode(false);
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    sendMessage(prompt, actionType);
  };

  // Format tool input for display
  const formatToolInput = (input?: Record<string, unknown>): string => {
    if (!input) return "";
    if (input.file) return String(input.file);
    if (input.query) return `"${input.query}"`;
    if (input.pattern) return `"${input.pattern}"`;
    return "";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Persistent Update Mode Toggle at Top */}
      <div className="flex-shrink-0 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-700 dark:text-amber-300 text-center mb-2">
          Log updates as they happen - meals, meds, energy levels, mood, completed tasks
        </p>
        <button
          onClick={() => setUpdateMode(!updateMode)}
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            updateMode
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          }`}
        >
          {updateMode ? "Update Mode ON - Type below and press Enter" : "Add Context Update"}
        </button>
      </div>

      {/* Messages - centered with max width for readability */}
      <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        <div className="max-w-4xl mx-auto p-4 space-y-4 chat-container">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <p className="text-lg mb-2">Welcome!</p>
              <p className="text-sm mb-6">Ask me anything, or use the quick actions below.</p>

              {/* Context reminder box */}
              <div className="max-w-md mx-auto bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-left">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Log updates as they happen:
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <li>&quot;Just woke up, slept 7 hours&quot;</li>
                  <li>&quot;Had coffee and a bagel&quot;</li>
                  <li>&quot;Finished my workout&quot;</li>
                  <li>&quot;Feeling stressed about work&quot;</li>
                  <li>&quot;Completed the report&quot;</li>
                  <li>&quot;Energy low this afternoon&quot;</li>
                </ul>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 italic">
                  The more context I have, the better I can help you.
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700"
                }`}
              >
                {message.role === "user" ? (
                  <div>
                    {message.images && message.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Attached ${idx + 1}`}
                            className="max-w-[150px] max-h-[150px] rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                ) : (
                  <div>
                    {/* Completed tool calls summary */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="space-y-1">
                          {message.toolCalls.map((tool, idx) => (
                            <div
                              key={`${tool.name}-${idx}`}
                              className="flex items-start gap-2 text-xs"
                            >
                              <span className="text-green-500 flex-shrink-0">✓</span>
                              <span className="flex-shrink-0">{tool.icon}</span>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {tool.friendlyName}
                                </span>
                                {formatToolInput(tool.input) && (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    {formatToolInput(tool.input)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-table:my-2 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-th:bg-gray-100 dark:prose-th:bg-gray-700 prose-table:border-collapse prose-th:border prose-td:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-td:border-gray-300 dark:prose-td:border-gray-600">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                <p className={`text-xs mt-1 ${
                  message.role === "user" ? "text-blue-100" : "text-gray-400"
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator with real-time tool calls */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700 max-w-[85%]">
                {/* Animated dots */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {toolCalls.length === 0 ? "Starting..." : "Working..."}
                  </span>
                </div>

                {/* Tool calls display */}
                {toolCalls.length > 0 && (
                  <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    {toolCalls.slice(-8).map((tool, idx) => (
                      <div
                        key={`${tool.name}-${tool.timestamp}-${idx}`}
                        className="flex items-start gap-2 text-xs animate-fadeIn"
                      >
                        <span className="text-base flex-shrink-0">{tool.icon}</span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">
                            {tool.friendlyName}
                          </span>
                          {formatToolInput(tool.input) && (
                            <span className="text-gray-400 dark:text-gray-500">
                              {formatToolInput(tool.input)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {toolCalls.length > 8 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                        +{toolCalls.length - 8} more actions...
                      </p>
                    )}
                  </div>
                )}

                {/* Connected MCP servers indicator */}
                {connectedServers.length > 0 && toolCalls.length === 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    {connectedServers.map((server) => (
                      <span
                        key={server}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      >
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        {getMcpDisplayName(server)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions - full width */}
      <QuickActions onAction={handleQuickAction} disabled={isLoading} />

      {/* Input Area - full width */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
        {updateMode && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Adding context update...
            </span>
            <button
              type="button"
              onClick={() => setUpdateMode(false)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
        {foodMode && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Logging food...
            </span>
            <button
              type="button"
              onClick={() => { setFoodMode(false); setSelectedImages([]); }}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
        {animeMode && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              Anime mode
            </span>
            <button
              type="button"
              onClick={() => setAnimeMode(false)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
        {reminderMode && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Setting reminder...
            </span>
            <button
              type="button"
              onClick={() => setReminderMode(false)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
        {/* Image preview area */}
        {selectedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {selectedImages.map((img, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={img.preview}
                  alt={`Selected ${idx + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            <span className="text-xs text-gray-500 dark:text-gray-400 self-center ml-2">
              {selectedImages.length}/10 images
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Hidden file input for general images */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Hidden camera input for food mode (prefers rear camera on mobile) */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />

          {/* Photo upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || selectedImages.length >= 10}
            className={`p-3 rounded-full transition-colors ${
              selectedImages.length > 0
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Add photos"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <VoiceInput
            ref={voiceRef}
            onResult={handleVoiceResult}
            onInterim={(transcript) => setInput(transcript)}
            disabled={isLoading}
          />

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={animeMode ? "What should I watch? Give feedback on an anime, or search for new ones..." : foodMode ? "Describe: portion, ingredients, how prepared..." : reminderMode ? "e.g., 'Call mom at 3pm' or 'Take medication in 30 minutes'..." : updateMode ? "Type your update and press Enter to save..." : "Type a message..."}
            rows={1}
            className={`flex-1 resize-none rounded-xl border px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent ${
              animeMode
                ? "border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20 focus:ring-purple-500"
                : foodMode
                  ? "border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20 focus:ring-green-500"
                  : reminderMode
                    ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 focus:ring-blue-500"
                    : updateMode
                      ? "border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 focus:ring-amber-500"
                      : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:ring-blue-500"
            }`}
            style={{ maxHeight: "120px", minHeight: "48px" }}
            disabled={isLoading}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && selectedImages.length === 0)}
            className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </div>
      </form>

      {/* CSS for fade-in animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
