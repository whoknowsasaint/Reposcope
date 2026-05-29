"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  GitBranch,
  Search,
  Plus,
  X,
  Loader2,
  AlertCircle,
  ChevronDown,
  Trash2,
  Check,
} from "lucide-react";
import { type Repo } from "@/lib/api";

interface RepoSelectorProps {
  selectedRepo: string | null;
  repos: Repo[];
  onSelect: (repoId: string) => void;
  onIndex: (url: string) => void;
  onDelete?: (repoId: string) => void;
  onUpdate?: (repoId: string) => void;
  isIndexing?: boolean;
  indexingError?: string | null;
  indexingProgress?: {
    stage: string;
    message: string;
    percent: number;
    files_processed?: number;
    files_total?: number;
    chunks_generated?: number;
  } | null;
}

export function RepoSelector({
  selectedRepo,
  repos,
  onSelect,
  onUpdate,
  onIndex,
  onDelete,
  isIndexing,
  indexingError,
  indexingProgress,
}: RepoSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isIndexing) {
      setIsOpen(true);
    }
  }, [isIndexing]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        if (!isIndexing) {
          setIsOpen(false);
          setShowAddForm(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isIndexing]);

  const selected = repos.find((r) => r.repo_id === selectedRepo);

  const filtered = repos.filter((r) =>
    r.repo_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError("Enter a GitHub repository URL");
      return false;
    }
    const shorthand = /^[\w-]+\/[\w-]+$/;
    const fullUrl = /^https:\/\/github\.com\/[\w-]+\/[\w-]+(\/)?$/;
    
    if (!shorthand.test(url.trim()) && !fullUrl.test(url.trim())) {
      setUrlError("Format: owner/repo or https://github.com/owner/repo");
      return false;
    }
    setUrlError("");
    return true;
  };

  const handleIndex = useCallback(() => {
    if (!validateUrl(newUrl)) return;
    let url = newUrl.trim();
    if (!url.startsWith("http")) {
      url = `https://github.com/${url}`;
    }
    onIndex(url);
  }, [newUrl, onIndex]);

  const showProgress = isIndexing;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          if (!isIndexing) setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all ${
          isOpen
            ? "bg-white/[0.08] ring-1 ring-white/[0.12]"
            : "bg-white/[0.04] hover:bg-white/[0.06] ring-1 ring-white/[0.06]"
        } ${isIndexing ? "ring-blue-500/30" : ""}`}
      >
        {isIndexing ? (
          <Loader2 size={14} className="text-blue-400 animate-spin" />
        ) : (
          <GitBranch size={14} className={selected ? "text-emerald-400" : "text-white/30"} />
        )}
        <span className="max-w-[180px] truncate text-white/70">
          {isIndexing ? "Indexing..." : selected ? selected.repo_name : "Select repository"}
        </span>
        <ChevronDown
          size={14}
          className={`text-white/20 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[360px] overflow-hidden z-50"
          style={{
            background: "rgba(30, 30, 35, 0.65)",
            borderRadius: "30px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(60px) saturate(1.2)",
            WebkitBackdropFilter: "blur(60px) saturate(1.2)",
          }}
          >
          {showProgress ? (
            <div className="p-5">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 size={18} className="text-blue-400 animate-spin" />
                  <div>
                    <p className="text-[14px] font-medium text-white/80">
                      {indexingProgress?.stage === "cloning" && "Cloning repository"}
                      {indexingProgress?.stage === "scanning" && "Scanning files"}
                      {indexingProgress?.stage === "chunking" && "Chunking code"}
                      {indexingProgress?.stage === "embedding" && "Generating embeddings"}
                      {indexingProgress?.stage === "storing" && "Saving to database"}
                      {!indexingProgress && "Starting..."}
                    </p>
                    <p className="text-[12px] text-white/40">
                      {indexingProgress?.message || "Preparing..."}
                    </p>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${indexingProgress?.percent || 5}%` }}
                  />
                </div>

                {indexingProgress?.files_processed !== undefined && (
                  <div className="flex items-center gap-4 text-[12px] text-white/30">
                    <span>{indexingProgress.files_processed}/{indexingProgress.files_total} files</span>
                    {indexingProgress.chunks_generated !== undefined && (
                      <span>{indexingProgress.chunks_generated} chunks</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-white/[0.06]">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search repos..."
                    className="w-full pl-8 pr-3 py-2 bg-white/[0.03] rounded-lg text-[13px] text-white/70 placeholder:text-white/20 outline-none focus:ring-1 focus:ring-white/[0.1]"
                    autoFocus
                  />
                </div>
              </div>

              {indexingError && (
                <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-[12px] flex items-center gap-2 ring-1 ring-red-500/20">
                  <AlertCircle size={12} />
                  {indexingError}
                </div>
              )}

              <div className="max-h-[280px] overflow-y-auto">
                {filtered.length === 0 && !showAddForm && (
                  <div className="text-center py-8">
                    <GitBranch size={20} className="text-white/10 mx-auto mb-2" />
                    <p className="text-[13px] text-white/30">
                      {searchQuery ? "No matches" : "No repositories"}
                    </p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="mt-3 text-[12px] text-blue-400 hover:text-blue-300 font-medium"
                    >
                      + Index a new repo
                    </button>
                  </div>
                )}

                {filtered.map((repo) => (
                  <div
                    key={repo.repo_id}
                    className={`group flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-white/[0.04] last:border-0 ${
                      selectedRepo === repo.repo_id
                        ? "bg-white/[0.04]"
                        : "hover:bg-white/[0.02]"
                    }`}
                    onClick={() => {
                      onSelect(repo.repo_id);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    {selectedRepo === repo.repo_id ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <GitBranch size={12} className="text-white/20" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-white/70 truncate">
                        {repo.repo_name}
                      </div>
                      <div className="text-[11px] text-white/30 font-mono truncate">
                        {repo.collection_name}
                      </div>
                    </div>

                    {onUpdate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(repo.repo_id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-500/10 rounded text-white/30 hover:text-blue-400 transition-all"
                        title="Update repo"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <polyline points="1,8 5,4 9,8" />
                          <line x1="5" y1="4" x2="5" y2="1" />
                        </svg>
                      </button>
                    )}

                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(repo.repo_id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded text-white/30 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] border-t border-white/[0.06] text-[13px] text-white/40 hover:text-white/70 transition-colors"
                >
                  <Plus size={14} />
                  Index new repository
                </button>
              ) : (
                <div className="p-3 border-t border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-white/50">Clone & Index</span>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setUrlError("");
                      }}
                      className="text-white/20 hover:text-white/50"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newUrl}
                        onChange={(e) => {
                          setNewUrl(e.target.value);
                          if (urlError) setUrlError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleIndex()}
                        placeholder="owner/repo"
                        className={`w-full px-3 py-2 bg-white/[0.03] rounded-lg text-[13px] text-white/70 placeholder:text-white/20 outline-none ${
                          urlError ? "ring-1 ring-red-500/30" : "focus:ring-1 focus:ring-white/[0.1]"
                        }`}
                        disabled={isIndexing}
                      />
                      {urlError && (
                        <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                          <AlertCircle size={10} />
                          {urlError}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleIndex}
                      disabled={isIndexing || !newUrl.trim()}
                      className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[13px] font-medium disabled:opacity-30 transition-colors"
                    >
                      {isIndexing ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    </button>
                  </div>

                  <p className="text-[11px] text-white/20">
                    Example: vercel/next.js or https://github.com/vercel/next.js
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}