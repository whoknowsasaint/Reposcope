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

  
  const glassPanelClass = "rounded-3xl backdrop-blur-2xl backdrop-saturate-150 p-8 shadow-2xl border border-white/[0.15]";
  const glassBg = "bg-[rgba(8,9,10,0.75)]";  

  if (type === "no-repo") {
    return (
      <div className="flex items-center justify-center p-8 min-h-full">
        <div className={`${glassPanelClass} ${glassBg} max-w-md w-full text-center`}>
          <div className="w-20 h-20 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08] flex items-center justify-center mx-auto mb-6">
            <Terminal size={36} className="text-white/30" strokeWidth={1.2} />
          </div>
          <h2 className="text-[26px] font-semibold tracking-tight text-white/90 mb-3">
            Chat with any codebase
          </h2>
          <p className="text-[15px] text-white/35 leading-relaxed mb-8 max-w-sm mx-auto">
            Select a repository from the dropdown above to get started. Ask questions in plain English and get answers with precise file references.
          </p>

          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 mb-6 text-left">
            <p className="text-[11px] text-white/25 uppercase tracking-wide font-medium mb-3">
              How it works
            </p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <GitBranch size={12} className="text-white/30" />
                </div>
                <div>
                  <p className="text-[13px] text-white/70 font-medium">Select a repository</p>
                  <p className="text-[12px] text-white/25">Choose from indexed repos or paste a GitHub URL</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <Command size={12} className="text-white/30" />
                </div>
                <div>
                  <p className="text-[13px] text-white/70 font-medium">Ask a question</p>
                  <p className="text-[12px] text-white/25">Use plain English. No need to know file names</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <BookOpen size={12} className="text-white/30" />
                </div>
                <div>
                  <p className="text-[13px] text-white/70 font-medium">Get references</p>
                  <p className="text-[12px] text-white/25">Answers include exact file paths and line numbers</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-white/20">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] ring-1 ring-white/[0.08] text-[11px] font-mono">⌘K</kbd> to start a new chat anytime
          </p>
        </div>
      </div>
    );
  }

  if (type === "indexing") {
    return (
      <div className="flex items-center justify-center p-8 min-h-full">
        <div className={`${glassPanelClass} ${glassBg} max-w-sm w-full text-center`}>
          <div className="w-16 h-16 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.08] flex items-center justify-center mx-auto mb-5">
            <Loader2 size={28} className="text-blue-400 animate-spin" strokeWidth={1.2} />
          </div>
          <h3 className="text-[18px] font-semibold text-white/80 mb-1">Indexing {repoName}</h3>
          {progress ? (
            <div className="space-y-3 mt-3">
              <p className="text-[13px] text-white/35">{progress.message}</p>
              <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              {progress.files_processed !== undefined && (
                <p className="text-[11px] text-white/25">
                  {progress.files_processed}/{progress.files_total} files
                  {progress.chunks_generated !== undefined && ` · ${progress.chunks_generated} chunks`}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-white/35 mt-3">
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
        <div className={`${glassPanelClass} ${glassBg} max-w-md w-full text-center`}>
          <div className="w-16 h-16 rounded-xl bg-emerald-500/[0.08] ring-1 ring-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <GitBranch size={28} className="text-emerald-400" strokeWidth={1.2} />
          </div>
          <h3 className="text-[20px] font-semibold text-white/90 mb-1">{repoName}</h3>
          <p className="text-[14px] text-white/35 mb-8">Ask anything about this codebase</p>
          <div className="space-y-2.5">
            {suggestions.map((q) => (
              <button
                key={q}
                onClick={() => onQuickStart?.(q)}
                className="w-full text-left px-5 py-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] text-[14px] text-white/60 hover:text-white/90 transition-all duration-200"
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
      <div className={`${glassPanelClass} ${glassBg} max-w-sm w-full text-center`}>
        <div className="w-16 h-16 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.08] flex items-center justify-center mx-auto mb-5">
          <Terminal size={28} className="text-white/30" strokeWidth={1.2} />
        </div>
        <h3 className="text-[18px] font-semibold text-white/80 mb-2">Start a conversation</h3>
        <p className="text-[14px] text-white/35">
          Click New Chat to begin
        </p>
      </div>
    </div>
  );
}