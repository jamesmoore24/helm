import { NextRequest } from "next/server";
import { askClaudeStreaming, StreamEvent, ConversationEntry, abortRequest, generateRequestId } from "@/lib/claude";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, images, conversationHistory } = body as {
      message?: string;
      images?: string[];
      conversationHistory?: ConversationEntry[];
    };

    if ((!message || typeof message !== "string") && (!images || images.length === 0)) {
      return new Response(JSON.stringify({ error: "Message or images required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (message && message.length > 10000) {
      return new Response(JSON.stringify({ error: "Message is too long" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate images if provided
    if (images) {
      if (!Array.isArray(images) || images.length > 10) {
        return new Response(JSON.stringify({ error: "Maximum 10 images allowed" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      for (const img of images) {
        if (typeof img !== "string" || !img.startsWith("data:image/")) {
          return new Response(JSON.stringify({ error: "Invalid image format" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

    // Generate unique request ID for process tracking (handles concurrent requests)
    const requestId = generateRequestId();

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Helper to send SSE event
        const sendEvent = (event: StreamEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          // Stream events from Claude
          for await (const event of askClaudeStreaming(message || "", images, conversationHistory, requestId)) {
            sendEvent(event);

            // If done or error, close the stream
            if (event.type === "done" || event.type === "error") {
              controller.close();
              return;
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
          sendEvent({
            type: "error",
            message: "An error occurred while processing your request.",
          });
          controller.close();
        }
      },
      cancel() {
        // Client disconnected (closed tab, navigated away, etc.)
        // Kill the Claude process to free resources
        console.log(`Client disconnected, aborting request ${requestId}`);
        abortRequest(requestId);
      },
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
