import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

// Track active Claude processes by request ID for cleanup (handles concurrent requests)
const activeProcesses = new Map<string, number>();

// Generate unique request ID
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Kill a specific Claude process by request ID (called when client disconnects)
export function abortRequest(requestId: string): void {
  const pid = activeProcesses.get(requestId);
  if (pid) {
    console.log(`Aborting Claude process ${pid} for request ${requestId} (client disconnected)`);
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Process already dead
      }
    }
    activeProcesses.delete(requestId);
  }
}

// Path to the repository root (parent of /web)
const REPO_ROOT = path.resolve(process.cwd(), "..");

// Event types for streaming
export interface ToolCallEvent {
  type: "tool";
  name: string;
  friendlyName: string;
  input?: Record<string, unknown>;
  icon: string;
}

export interface TextEvent {
  type: "text";
  content: string;
}

export interface DoneEvent {
  type: "done";
  content: string;
  imagePaths?: string[]; // Paths to uploaded images (kept for multi-turn access)
}

export interface ErrorEvent {
  type: "error";
  message: string;
}

export interface InitEvent {
  type: "init";
  tools: string[];
  mcpServers: string[];
}

export type StreamEvent = ToolCallEvent | TextEvent | DoneEvent | ErrorEvent | InitEvent;

// Map tool names to friendly names and icons
function getToolDisplay(toolName: string, input?: Record<string, unknown>): { friendlyName: string; icon: string } {
  // MCP tools
  if (toolName.startsWith("mcp__calendar__")) {
    const action = toolName.replace("mcp__calendar__", "");
    const account = input?.account ? ` (${input.account})` : "";
    return { friendlyName: `Calendar: ${action.replace(/-/g, " ")}${account}`, icon: "📅" };
  }
  if (toolName.startsWith("mcp__gmail__") || toolName.startsWith("mcp__gmail-personal__")) {
    const action = toolName.replace(/mcp__gmail(-personal)?__/, "");
    const account = input?.account ? ` (${input.account})` : "";
    return { friendlyName: `Email: ${action.replace(/_/g, " ")}${account}`, icon: "📧" };
  }
  if (toolName.startsWith("mcp__slack__")) {
    const action = toolName.replace("mcp__slack__", "");

    // Helper to truncate strings
    const truncate = (s: string, len: number) => s.length > len ? s.slice(0, len) + "..." : s;

    // Map Slack actions to user-friendly descriptions
    const slackActions: Record<string, string> = {
      list_channels: "Listing channels",
      get_channel_history: input?.channel ? `Reading #${truncate(input.channel as string, 20)}` : "Reading channel",
      get_thread_replies: "Reading thread replies",
      post_message: input?.channel ? `Posting to #${truncate(input.channel as string, 20)}` : "Posting message",
      reply_to_thread: "Replying to thread",
      add_reaction: input?.emoji ? `Reacting with :${input.emoji}:` : "Adding reaction",
      get_users: "Getting users",
      get_user_profile: input?.user_id ? "Getting user profile" : "Getting user profile",
      search_messages: input?.query ? `Searching: "${truncate(input.query as string, 25)}"` : "Searching messages",
      list_workspaces: "Listing workspaces",
      get_workspace_info: "Getting workspace info",
    };

    const friendlyName = slackActions[action] || `Slack: ${action.replace(/_/g, " ")}`;
    return { friendlyName, icon: "💬" };
  }
  if (toolName.startsWith("mcp__plugin_playwright")) {
    // Extract the specific action from the tool name
    const action = toolName.replace("mcp__plugin_playwright_playwright__", "");

    // Helper to truncate strings
    const truncate = (s: string, len: number) => s.length > len ? s.slice(0, len) + "..." : s;

    // Helper to extract hostname from URL
    const getHost = (url: string) => {
      try { return new URL(url).hostname; } catch { return truncate(url, 30); }
    };

    // Map Playwright actions to user-friendly descriptions based on input
    const playwrightActions: Record<string, string> = {
      browser_navigate: input?.url ? `Navigating → ${getHost(input.url as string)}` : "Navigating",
      browser_click: input?.element ? `Clicking: ${truncate(input.element as string, 35)}` : "Clicking element",
      browser_type: input?.text ? `Typing: "${truncate(input.text as string, 25)}"` : "Typing text",
      browser_snapshot: "Reading page content",
      browser_take_screenshot: "Taking screenshot",
      browser_close: "Closing browser",
      browser_hover: input?.element ? `Hovering: ${truncate(input.element as string, 35)}` : "Hovering",
      browser_select_option: input?.element ? `Selecting: ${truncate(input.element as string, 35)}` : "Selecting option",
      browser_fill_form: "Filling form fields",
      browser_press_key: input?.key ? `Pressing key: ${input.key}` : "Pressing key",
      browser_wait_for: input?.text ? `Waiting for: "${truncate(input.text as string, 25)}"` : "Waiting",
      browser_tabs: input?.action ? `Tabs: ${input.action}` : "Managing tabs",
      browser_evaluate: "Running JavaScript",
      browser_console_messages: "Reading console logs",
      browser_network_requests: "Reading network requests",
      browser_resize: "Resizing browser",
      browser_install: "Installing browser",
      browser_handle_dialog: "Handling dialog",
      browser_file_upload: "Uploading file",
      browser_drag: "Dragging element",
      browser_navigate_back: "Going back",
      browser_run_code: "Running Playwright code",
    };

    const friendlyName = playwrightActions[action] || `Browser: ${action.replace(/_/g, " ")}`;
    return { friendlyName, icon: "🌐" };
  }

  // Helper to truncate strings (also used for built-in tools)
  const truncate = (s: string, len: number) => s.length > len ? s.slice(0, len) + "..." : s;

  // Helper to get filename from path
  const getFileName = (filePath: string) => {
    const parts = filePath.split("/");
    return parts[parts.length - 1];
  };

  // Built-in tools with contextual info from input
  switch (toolName) {
    case "Read":
      return {
        friendlyName: input?.file_path ? `Reading: ${getFileName(input.file_path as string)}` : "Reading file",
        icon: "📄",
      };
    case "Write":
      return {
        friendlyName: input?.file_path ? `Writing: ${getFileName(input.file_path as string)}` : "Writing file",
        icon: "✏️",
      };
    case "Edit":
      return {
        friendlyName: input?.file_path ? `Editing: ${getFileName(input.file_path as string)}` : "Editing file",
        icon: "📝",
      };
    case "Glob":
      return {
        friendlyName: input?.pattern ? `Glob: ${truncate(input.pattern as string, 30)}` : "Searching files",
        icon: "🔎",
      };
    case "Grep":
      return {
        friendlyName: input?.pattern ? `Grep: ${truncate(input.pattern as string, 30)}` : "Searching content",
        icon: "🔍",
      };
    case "Bash":
      return {
        friendlyName: input?.command ? `Running: ${truncate(input.command as string, 35)}` : "Running command",
        icon: "💻",
      };
    case "WebSearch":
      return {
        friendlyName: input?.query ? `Searching: "${truncate(input.query as string, 30)}"` : "Searching web",
        icon: "🌐",
      };
    case "WebFetch":
      return {
        friendlyName: input?.url ? `Fetching: ${truncate(input.url as string, 35)}` : "Fetching webpage",
        icon: "🌐",
      };
    case "Task":
      return {
        friendlyName: input?.description ? `Agent: ${truncate(input.description as string, 35)}` : "Running agent",
        icon: "🤖",
      };
    case "TodoWrite":
      return {
        friendlyName: "Updating todos",
        icon: "✅",
      };
    case "AskUserQuestion":
      return {
        friendlyName: "Asking question",
        icon: "❓",
      };
    default:
      return { friendlyName: toolName, icon: "🔧" };
  }
}

// Helper to save base64 image to temp file
function saveBase64ImageToTemp(base64Data: string, index: number): string {
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid base64 image format");
  }

  const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
  const content = Buffer.from(matches[2], "base64");

  const tempDir = os.tmpdir();
  const filename = `helm-upload-${Date.now()}-${index}.${ext}`;
  const filepath = path.join(tempDir, filename);

  fs.writeFileSync(filepath, content);
  return filepath;
}

// Helper to cleanup temp files
function cleanupTempFiles(files: string[]) {
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (e) {
      console.error("Failed to cleanup temp file:", file, e);
    }
  }
}

// Force kill a specific Claude process and its children by PID
function forceKillProcess(pid: number) {
  try {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Process already dead
      }
    }
    console.log(`Force killed process ${pid}`);
  } catch (e) {
    console.error(`Error killing process ${pid}:`, e);
  }
}

// Conversation history entry for multi-turn context
export interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
  imagePaths?: string[]; // Paths to images that can be re-read
}

// Streaming version that yields events
export async function* askClaudeStreaming(
  message: string,
  images?: string[],
  conversationHistory?: ConversationEntry[],
  requestId?: string
): AsyncGenerator<StreamEvent> {
  const tempImagePaths: string[] = [];
  let finalResult = "";
  let lastTextContent = ""; // Track the last text content from assistant messages
  const seenToolCalls = new Set<string>(); // Deduplicate tool calls

  try {
    // Save images to temp files if provided
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        try {
          const tempPath = saveBase64ImageToTemp(images[i], i);
          tempImagePaths.push(tempPath);
        } catch (e) {
          console.error("Failed to save image", i, e);
        }
      }
    }

    // Sanitize input
    const sanitizedMessage = message.replace(/[`$\\]/g, "").slice(0, 10000);

    // Add current date/time context
    const now = new Date();
    const timeContext = `[Current time: ${now.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
      timeZoneName: "short",
    })}]\n\n`;

    // Build conversation history context
    let historyContext = "";
    if (conversationHistory && conversationHistory.length > 0) {
      historyContext = "[Previous conversation:]\n";
      for (const entry of conversationHistory.slice(-15)) { // Last 15 messages
        const role = entry.role === "user" ? "User" : "Assistant";
        let content = entry.content;
        // Note if images were attached (Claude can re-read them if needed)
        if (entry.imagePaths && entry.imagePaths.length > 0) {
          content += ` [Images available: ${entry.imagePaths.join(", ")}]`;
        }
        historyContext += `${role}: ${content}\n\n`;
      }
      historyContext += "[Current message:]\n";
    }

    const messageWithTime = timeContext + historyContext + sanitizedMessage;

    // Build args array - use streaming JSON with verbose
    const args = [
      "-p",
      "-",
      "--output-format",
      "stream-json",
      "--verbose",
      "--dangerously-skip-permissions",
      "--max-turns",
      "30",
    ];

    // Add image paths to the message
    let imageInstructions = "";
    if (tempImagePaths.length > 0) {
      imageInstructions =
        "\n\n[The user has attached the following image(s). Please read and analyze them using the Read tool:]\n";
      for (const imagePath of tempImagePaths) {
        imageInstructions += `- ${imagePath}\n`;
      }
      imageInstructions += "\n";
    }

    const claude = spawn("claude", args, {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        HOME: process.env.HOME,
      },
      detached: true,
    });

    const claudePid = claude.pid;

    // Track this process by request ID for cleanup on disconnect
    if (requestId && claudePid) {
      activeProcesses.set(requestId, claudePid);
    }

    // Create a promise that resolves when the process exits
    const processComplete = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (claudePid) forceKillProcess(claudePid);
        cleanupTempFiles(tempImagePaths);
        if (requestId) activeProcesses.delete(requestId);
        reject(new Error("Timeout"));
      }, 600000); // 10 minute timeout

      claude.on("close", () => {
        clearTimeout(timeout);
        // Don't cleanup temp files on success - keep for multi-turn conversation
        // Files will be cleaned up by cron job after 1 hour
        if (requestId) activeProcesses.delete(requestId);
        if (claudePid) {
          setTimeout(() => forceKillProcess(claudePid), 500);
        }
        resolve();
      });

      claude.on("error", (error) => {
        clearTimeout(timeout);
        cleanupTempFiles(tempImagePaths);
        if (claudePid) forceKillProcess(claudePid);
        if (requestId) activeProcesses.delete(requestId);
        reject(error);
      });
    });

    // Write the prompt to stdin
    claude.stdin.write(messageWithTime + imageInstructions);
    claude.stdin.end();

    // Process stdout line by line
    let buffer = "";

    for await (const chunk of claude.stdout) {
      buffer += chunk.toString();

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const parsed = JSON.parse(line);

          // Handle system init message
          if (parsed.type === "system" && parsed.subtype === "init") {
            const mcpServers = (parsed.mcp_servers || [])
              .filter((s: { status: string }) => s.status === "connected")
              .map((s: { name: string }) => s.name);

            yield {
              type: "init",
              tools: parsed.tools || [],
              mcpServers,
            };
          }

          // Handle assistant messages with tool calls
          if (parsed.type === "assistant" && parsed.message?.content) {
            for (const item of parsed.message.content) {
              if (item.type === "tool_use") {
                const toolId = `${item.name}-${JSON.stringify(item.input || {}).slice(0, 50)}`;

                // Deduplicate
                if (!seenToolCalls.has(toolId)) {
                  seenToolCalls.add(toolId);

                  const { friendlyName, icon } = getToolDisplay(item.name, item.input);

                  // Extract meaningful info from input
                  let displayInput = item.input;
                  if (item.name === "Read" && item.input?.file_path) {
                    // Show just the filename for Read
                    const filePath = item.input.file_path as string;
                    displayInput = { file: path.basename(filePath) };
                  } else if (item.name === "WebSearch" && item.input?.query) {
                    displayInput = { query: item.input.query };
                  } else if (item.name === "Grep" && item.input?.pattern) {
                    displayInput = { pattern: item.input.pattern };
                  }

                  yield {
                    type: "tool",
                    name: item.name,
                    friendlyName,
                    input: displayInput,
                    icon,
                  };
                }
              }

              // Capture text content - keep updating lastTextContent
              // The final answer is usually in the last text block
              if (item.type === "text" && item.text) {
                lastTextContent = item.text;
              }
            }
          }

          // Handle result message (final response) - this is the authoritative final answer
          if (parsed.type === "result") {
            if (parsed.result) {
              finalResult = parsed.result;
            } else if (parsed.subtype === "error_max_turns") {
              // Hit max turns without completing - provide helpful message
              finalResult = "I ran out of turns while working on this task. The request may be too complex for a single query. Try breaking it into smaller questions, or ask me to continue where I left off.";
            }
          }
        } catch (parseError) {
          // Ignore parse errors for non-JSON lines
          console.error("Failed to parse line:", line.slice(0, 100));
        }
      }
    }

    // Wait for process to complete
    try {
      await processComplete;
    } catch (error) {
      if (error instanceof Error && error.message === "Timeout") {
        yield {
          type: "error",
          message: "Request timed out (10 minutes). Please try again with a simpler question.",
        };
        return;
      }
      throw error;
    }

    // Yield final result - prefer result message, fall back to last text content
    const responseContent = finalResult || lastTextContent || "I processed your request but have no response.";
    yield {
      type: "done",
      content: responseContent,
      imagePaths: tempImagePaths.length > 0 ? tempImagePaths : undefined,
    };
  } catch (error) {
    cleanupTempFiles(tempImagePaths);
    if (requestId) {
      const pid = activeProcesses.get(requestId);
      if (pid) {
        forceKillProcess(pid);
        activeProcesses.delete(requestId);
      }
    }

    console.error("Error in askClaudeStreaming:", error);
    yield {
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Sorry, there was an error connecting to Claude.",
    };
  }
}

// Legacy non-streaming version (kept for compatibility)
export async function askClaude(message: string, images?: string[]): Promise<string> {
  let result = "";

  for await (const event of askClaudeStreaming(message, images)) {
    if (event.type === "done") {
      result = event.content;
    } else if (event.type === "error") {
      result = event.message;
    }
  }

  return result;
}
