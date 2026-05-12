"use client";

import { useState } from "react";
import { Terminal, GitBranch, Zap, BookOpen, Command, Loader2 } from "lucide-react";

interface EmptyStateProps {
  type: "no-repo" | "no-conversation" | "indexing" | "ready";
  repoName?: string;
  onQuickStart?: (query: string) => void;
  progress?: {
    stage: string;
    message: string;
    percent: number;
    files_processed?: number;
    files_total?: number;
    chunks_generated?: number;
  };
}

export function EmptyState({ type, repoName, onQuickStart, progress }: EmptyStateProps) {
  const suggestions = [
    "How does the routing work?",
    "Walk me through the authentication flow",
    "What's the database schema?",
    "Show me all the API endpoints",
  ];

  if (type === "no-repo") {
    return (
      <div className="flex items-center justify-center p-8 min-h-full">
        <div className="text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center mx-auto mb-8">
            <Terminal size={36} className="text-[#86868b]" strokeWidth={1} />
          </div>
          <h2 className="text-[24px] font-semibold tracking-tight mb-3">
            Chat with any codebase
          </h2>
          <p className="text-[15px] text-[#86868b] leading-relaxed mb-10 max-w-sm mx-auto">
            Select a repository from the dropdown above to get started. Ask questions in plain English and get answers with precise file references.
          </p>

          <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] p-6 mb-6 text-left">
            <p className="text-[12px] text-[#636366] uppercase tracking-wide font-medium mb-4">
              How it works
            </p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <GitBranch size={14} className="text-[#86868b]" strokeWidth={1} />
                </div>
                <div>
                  <p className="text-[14px] text-[#e5e5e7] font-medium">Select a repository</p>
                  <p className="text-[13px] text-[#86868b]">Choose from indexed repos or paste a GitHub URL</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <Command size={14} className="text-[#86868b]" strokeWidth={1} />
                </div>
                <div>
                  <p className="text-[14px] text-[#e5e5e7] font-medium">Ask a question</p>
                  <p className="text-[13px] text-[#86868b]">Use plain English. No need to know file names</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <BookOpen size={14} className="text-[#86868b]" strokeWidth={1} />
                </div>
                <div>
                  <p className="text-[14px] text-[#e5e5e7] font-medium">Get references</p>
                  <p className="text-[13px] text-[#86868b]">Answers include exact file paths and line numbers</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[12px] text-[#484f58]">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] ring-1 ring-white/[0.08] text-[11px] font-mono">⌘K</kbd> to start a new chat anytime
          </p>
        </div>
      </div>
    );
  }

  if (type === "indexing") {
    return (
      <div className="flex items-center justify-center p-8 min-h-full">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center mx-auto mb-6">
            <Loader2 size={28} className="text-blue-400 animate-spin" strokeWidth={1} />
          </div>
          <h3 className="text-[18px] font-semibold mb-2">Indexing {repoName}</h3>
          {progress ? (
            <div className="space-y-3">
              <p className="text-[14px] text-[#86868b]">{progress.message}</p>
              <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              {progress.files_processed !== undefined && (
                <p className="text-[12px] text-[#636366]">
                  {progress.files_processed}/{progress.files_total} files
                  {progress.chunks_generated !== undefined && ` · ${progress.chunks_generated} chunks`}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[14px] text-[#86868b]">
              Parsing AST and generating embeddings
            </p>
          )}
        </div>
      </div>
    );
  }

  if (type === "ready") {
    return (
      <div className="flex items-center justify-center p-8 min-h-full">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/[0.06] ring-1 ring-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <GitBranch size={28} className="text-emerald-400" strokeWidth={1} />
          </div>
          <h3 className="text-[18px] font-semibold mb-1">{repoName}</h3>
          <p className="text-[14px] text-[#86868b] mb-10">Ask anything about this codebase</p>
          <div className="space-y-2">
            {suggestions.map((q) => (
              <button
                key={q}
                onClick={() => onQuickStart?.(q)}
                className="w-full text-center px-5 py-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] ring-1 ring-white/[0.06] text-[15px] text-[#a1a1a6] hover:text-[#e5e5e7] transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8 min-h-full">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center mx-auto mb-6">
          <Terminal size={28} className="text-[#86868b]" strokeWidth={1} />
        </div>
        <h3 className="text-[18px] font-semibold mb-2">Start a conversation</h3>
        <p className="text-[14px] text-[#86868b]">
          Click New Chat to begin
        </p>
      </div>
    </div>
  );
}