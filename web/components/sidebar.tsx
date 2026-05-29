"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Search,
  X,
  GitBranch,
  Database,
  Terminal,
} from "lucide-react";
import { listConversations, createConversation, deleteConversation, type Conversation } from "@/lib/api";
import { formatRelativeTime } from "@/lib/time";
import Link from "next/link";

interface SidebarProps {
  repoId: string | null;
  repoName?: string;
  repoChunkCount?: number;
  selectedConversation: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: (id: number) => void;
}

export function Sidebar({
  repoId,
  repoName,
  repoChunkCount,
  selectedConversation,
  onSelectConversation,
  onNewConversation,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filtered, setFiltered] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (repoId) {
      loadConversations();
    } else {
      setConversations([]);
      setFiltered([]);
    }
  }, [repoId]);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFiltered(
      q
        ? conversations.filter((c) => c.title.toLowerCase().includes(q))
        : conversations
    );
    setFocusedIndex(-1);
  }, [searchQuery, conversations]);

  async function loadConversations() {
    if (!repoId) return;
    try {
      const data = await listConversations(repoId);
      setConversations(data);
      setFiltered(data);
    } catch (e) {
      console.error("Failed to load conversations", e);
    }
  }

  async function handleNewChat() {
    if (!repoId) return;
    setIsLoading(true);
    try {
      const conv = await createConversation(repoId, repoName || undefined);
      await loadConversations();
      onNewConversation(conv.id);
      setSearchQuery("");
    } catch (e) {
      console.error("Failed to create conversation", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await deleteConversation(id);
      if (selectedConversation === id) {
        onSelectConversation(0);
      }
      await loadConversations();
    } catch (e) {
      console.error("Failed to delete conversation", e);
    }
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Enter" && focusedIndex >= 0) {
        e.preventDefault();
        onSelectConversation(filtered[focusedIndex].id);
      } else if (e.key === "Delete" && focusedIndex >= 0) {
        e.preventDefault();
        handleDelete(e as any, filtered[focusedIndex].id);
      } else if (e.key === "Escape") {
        setSearchQuery("");
        searchRef.current?.blur();
      }
    },
    [filtered, focusedIndex, onSelectConversation]
  );

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[focusedIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0c]/80 backdrop-blur-xl border-r border-white/[0.08]">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center ring-1 ring-white/[0.1]">
            <Terminal size={14} className="text-white/70" />
          </div>
          <Link href="/" className="text-[14px] font-semibold tracking-tight text-white/80 hover:text-white transition-colors">Reposcope</Link>
        </div>

        <button
          onClick={handleNewChat}
          disabled={!repoId || isLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/[0.08] hover:bg-white/[0.12] rounded-lg text-[13px] font-medium text-white/70 hover:text-white/90 disabled:opacity-30 transition-all active:scale-[0.98]"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Plus size={14} strokeWidth={1.5} />
          )}
          New Chat
          <span className="text-[10px] text-white/30 ml-auto">⌘K</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search chats..."
            className="w-full pl-8 pr-7 py-1.5 bg-white/[0.04] rounded-lg text-[12px] text-white/70 placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/[0.1] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {filtered.length === 0 && (
          <div className="text-center py-8 px-4">
            {searchQuery ? (
              <>
                <Search size={18} className="text-white/20 mx-auto mb-2" />
                <p className="text-[12px] text-white/30">No matches for "{searchQuery}"</p>
              </>
            ) : repoId ? (
              <>
                <MessageSquare size={18} className="text-white/20 mx-auto mb-2" />
                <p className="text-[12px] text-white/40 mb-1">No conversations yet</p>
                <p className="text-[11px] text-white/20">Start a new chat to explore this repo</p>
              </>
            ) : (
              <>
                <GitBranch size={18} className="text-white/20 mx-auto mb-2" />
                <p className="text-[12px] text-white/40 mb-1">No repository selected</p>
                <p className="text-[11px] text-white/20">Select a repo from the dropdown above</p>
              </>
            )}
          </div>
        )}

        {filtered.map((conv, index) => (
          <div
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
              selectedConversation === conv.id
                ? "bg-white/[0.08] ring-1 ring-white/[0.1]"
                : focusedIndex === index
                ? "bg-white/[0.06]"
                : "hover:bg-white/[0.04]"
            }`}
            role="button"
            tabIndex={0}
          >
            <MessageSquare
              size={12}
              className={`flex-shrink-0 ${
                selectedConversation === conv.id ? "text-blue-400" : "text-white/30"
              }`}
              strokeWidth={1.5}
            />
            <span
              className={`text-[12px] truncate flex-1 ${
                selectedConversation === conv.id ? "text-white/90 font-medium" : "text-white/50"
              }`}
            >
              {conv.title}
            </span>
            <span className="text-[10px] text-white/20 group-hover:hidden">
              {formatRelativeTime(conv.created_at)}
            </span>
            <button
              onClick={(e) => handleDelete(e, conv.id)}
              className="hidden group-hover:flex p-1 hover:bg-red-500/10 rounded-md text-white/30 hover:text-red-400 transition-all"
              title="Delete conversation"
            >
              <Trash2 size={11} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.08] space-y-3">
        {repoId && repoName && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
            <GitBranch size={11} className="text-emerald-400/70 flex-shrink-0" />
            <span className="text-[11px] text-white/50 truncate flex-1 font-mono">
              {repoName}
            </span>
            {repoChunkCount !== undefined && (
              <span className="text-[10px] text-white/30 flex items-center gap-1">
                <Database size={9} />
                {repoChunkCount.toLocaleString()}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-white/20 px-2">
          <span>
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </span>
          <span>{filtered.length !== conversations.length && `${filtered.length} shown`}</span>
        </div>
      </div>
    </div>
  );
}