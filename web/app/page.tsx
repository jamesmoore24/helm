"use client";

import { ChatInterface } from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="h-[100dvh] bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex flex-col overflow-hidden">
      {/* Header - full width with centered content */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm safe-area-top">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Kirana
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your AI assistant
          </p>
        </div>
      </header>

      {/* Chat Interface - full width */}
      <ChatInterface />
    </main>
  );
}
