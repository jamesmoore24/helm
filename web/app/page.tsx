"use client";

import { useState, useCallback } from "react";
import { ChatInterface } from "@/components/ChatInterface";

interface Tab {
  id: string;
  summary: string;
}

// Max concurrent agent tabs - configurable via env var
// Default: 3 for 2GB+ RAM, reduce to 2 for 1GB, 1 for 512MB
const MAX_TABS = parseInt(process.env.NEXT_PUBLIC_MAX_TABS || "3", 10);

export default function Home() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "1", summary: "New Chat" }
  ]);
  const [activeTabId, setActiveTabId] = useState("1");

  const maxTabs = MAX_TABS;

  const addTab = () => {
    if (tabs.length >= maxTabs) return;
    const newId = Date.now().toString();
    setTabs(prev => [...prev, { id: newId, summary: "New Chat" }]);
    setActiveTabId(newId);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Don't close last tab

    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    // If closing active tab, switch to the previous tab or first available
    if (activeTabId === tabId) {
      const closedIndex = tabs.findIndex(t => t.id === tabId);
      const newActiveIndex = Math.max(0, closedIndex - 1);
      setActiveTabId(newTabs[newActiveIndex]?.id || newTabs[0]?.id);
    }
  };

  const updateTabSummary = useCallback((tabId: string, summary: string) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, summary } : t
    ));
  }, []);

  return (
    <main className="h-full flex flex-col overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header - full width with centered content */}
      <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm safe-area-top">
        {/* Title row */}
        <div className="px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Helm
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your AI assistant
            </p>
          </div>
        </div>

        {/* Tab bar - inverted Chrome-style tabs at bottom of header */}
        <div className="px-4 pb-0">
          <div className="max-w-4xl mx-auto flex items-end gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group relative flex items-center gap-2 px-4 py-2 min-w-[120px] max-w-[200px] text-sm font-medium transition-all duration-200 ${
                  activeTabId === tab.id
                    ? "bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-white rounded-t-xl border-t border-l border-r border-gray-200 dark:border-gray-700 -mb-px z-10"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-t-lg border border-transparent hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {/* Tab content */}
                <span className="truncate flex-1 text-left">
                  {tab.summary}
                </span>

                {/* Close button (only show if more than 1 tab) */}
                {tabs.length > 1 && (
                  <span
                    onClick={(e) => closeTab(tab.id, e)}
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      activeTabId === tab.id
                        ? "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        : "opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                )}
              </button>
            ))}

            {/* Add tab button */}
            {tabs.length < maxTabs && (
              <button
                onClick={addTab}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-1"
                title="New chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Chat Interfaces - render all but only show active */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 flex flex-col ${activeTabId === tab.id ? 'z-10' : 'z-0 invisible'}`}
          >
            <ChatInterface
              tabId={tab.id}
              onSummaryChange={(summary) => updateTabSummary(tab.id, summary)}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
