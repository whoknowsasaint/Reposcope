"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Terminal,
  FileCode,
  Settings,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronRight,
  Menu,
  MessageSquare,
  Plus,
  Check,
} from "lucide-react";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage } from "@/components/chat-message";
import { RepoSelector } from "@/components/repo-selector";
import { Sidebar } from "@/components/sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { ConfirmModal } from "@/components/confirm-modal";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { EmptyState } from "@/components/empty-state";
import {
  listRepos,
  indexRepo,
  updateRepo,
  deleteRepo,
  listConversations,
  createConversation,
  getMessages,
  deleteConversation,
  streamMessage,
  getIndexingStatus,
  type Repo,
  type Conversation,
  type Message,
  type Chunk,
  type StreamEvent,
} from "@/lib/api";

/* ─── Keyboard Shortcuts ─── */
function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const key = [
        e.metaKey ? "cmd" : "",
        e.ctrlKey ? "ctrl" : "",
        e.altKey ? "alt" : "",
        e.shiftKey ? "shift" : "",
        e.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join("+");

      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

/* ─── Error Toast ─── */
function ErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 ring-1 ring-red-500/20 shadow-xl">
        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-[13px] font-medium">Error</p>
          <p className="text-[12px] text-red-300 mt-0.5">{message}</p>
        </div>
        <button onClick={onClose} className="text-red-400/60 hover:text-red-400">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─── Source Panel ─── */
function SourcePanel({
  chunks,
  onClose,
}: {
  chunks: Chunk[];
  onClose: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  if (!chunks.length) return null;

  const files = chunks.reduce((acc, chunk) => {
    if (!acc[chunk.file_path]) acc[chunk.file_path] = [];
    acc[chunk.file_path].push(chunk);
    return acc;
  }, {} as Record<string, Chunk[]>);

  return (
    <div className="w-80 h-full bg-[#0d1117] border-l border-white/[0.06] flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
        <span className="text-[13px] font-semibold">Sources</span>
        <button onClick={onClose} className="text-[#636366] hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(files).map(([path, fileChunks]) => (
          <div key={path} className="border-b border-white/[0.04]">
            <button
              onClick={() => setSelectedFile(selectedFile === path ? null : path)}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
            >
              {selectedFile === path ? (
                <ChevronDown size={14} className="text-[#636366]" />
              ) : (
                <ChevronRight size={14} className="text-[#636366]" />
              )}
              <FileCode size={14} className="text-blue-400" />
              <span className="text-[12px] text-[#8b949e] font-mono truncate">
                {path.split("/").pop()}
              </span>
              <span className="text-[11px] text-[#636366] ml-auto">
                {fileChunks.length}
              </span>
            </button>

            {selectedFile === path && (
              <div className="px-3 pb-2 space-y-1">
                {fileChunks.map((chunk, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-white/[0.02] ring-1 ring-white/[0.04]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-emerald-400 font-medium">
                        {chunk.chunk_type}
                      </span>
                      <span className="text-[11px] text-[#636366] font-mono">
                        L{chunk.start_line}-{chunk.end_line}
                      </span>
                    </div>
                    {chunk.content && (
                      <pre className="text-[11px] text-[#8b949e] font-mono leading-relaxed line-clamp-3">
                        {chunk.content}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Icon Rail ─── */
function IconRail({
  onExpand,
  onNewChat,
  conversations,
  selectedConversation,
  onSelectConversation,
}: {
  onExpand: () => void;
  onNewChat: () => void;
  conversations: Conversation[];
  selectedConversation: number | null;
  onSelectConversation: (id: number) => void;
}) {
  return (
    <div className="w-14 h-full bg-[#0d1117] border-r border-white/[0.06] flex flex-col items-center py-3 gap-2">
      <button
        onClick={onExpand}
        className="p-2 hover:bg-white/[0.06] rounded-lg text-[#636366] hover:text-white transition-colors"
        title="Expand sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="4" x2="14" y2="10" />
          <polyline points="14,4 14,16" />
        </svg>
      </button>

      <button
        onClick={onNewChat}
        className="p-2 hover:bg-white/[0.06] rounded-lg text-[#636366] hover:text-white transition-colors"
        title="New chat (⌘K)"
      >
        <Plus size={18} strokeWidth={1.5} />
      </button>

      <div className="flex-1 overflow-y-auto w-full px-1 space-y-0.5">
        {conversations.slice(0, 8).map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={`w-full p-2 rounded-lg flex items-center justify-center transition-colors ${
              selectedConversation === conv.id
                ? "bg-white/[0.08] text-blue-400"
                : "text-[#636366] hover:bg-white/[0.04] hover:text-[#8b949e]"
            }`}
            title={conv.title}
          >
            <MessageSquare size={14} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Chat Page ─── */
export default function ChatPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [currentChunks, setCurrentChunks] = useState<Chunk[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexingError, setIndexingError] = useState<string | null>(null);
  const [indexingProgress, setIndexingProgress] = useState<any>(null);
  const [indexingRepoName, setIndexingRepoName] = useState<string>("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [expandedMessage, setExpandedMessage] = useState<{ role: string; content: string } | null>(null);

  const abortStreamRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ─── Streaming batching refs ───
  const tokenBufferRef = useRef("");
  const rafRef = useRef<number>();

  // ─── Scroll tracking ───
  const userScrolledRef = useRef(false);

  // ─── Stable callbacks for memo ───
  const handleRetry = useCallback(() => retryLastMessage(), []);
  const handleDeleteMessage = useCallback((i: number) => {
    setMessages((prev) => prev.filter((_, idx) => idx !== i));
  }, []);
  const handleExpandMessage = useCallback((role: string, content: string) => {
    setExpandedMessage({ role, content });
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(null), 3000);
    return () => clearTimeout(timer);
  }, [successToast]);

  useEffect(() => {
    loadRepos();
  }, []);

  async function loadRepos() {
    try {
      const data = await listRepos();
      setRepos(data);
    } catch (e: any) {
      setError(e.message || "Failed to load repositories");
    }
  }

  useEffect(() => {
    if (selectedRepo) {
      loadConversations();
    } else {
      setConversations([]);
      setSelectedConversation(null);
    }
  }, [selectedRepo]);

  async function loadConversations() {
    if (!selectedRepo) return;
    try {
      const data = await listConversations(selectedRepo);
      setConversations(data);
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0].id);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load conversations");
    }
  }

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    } else {
      setMessages([]);
    }
  }, [selectedConversation]);

  async function loadMessages(convId: number) {
    try {
      const data = await getMessages(convId);
      setMessages(data);
    } catch (e: any) {
      setError(e.message || "Failed to load messages");
    }
  }

  async function handleNewChat() {
    if (!selectedRepo) return;
    try {
      const repo = repos.find((r) => r.repo_id === selectedRepo);
      const conv = await createConversation(selectedRepo, repo?.repo_name);
      await loadConversations();
      setSelectedConversation(conv.id);
    } catch (e: any) {
      setError(e.message || "Failed to create conversation");
    }
  }

  async function handleDeleteConversation(id: number) {
    try {
      await deleteConversation(id);
      if (selectedConversation === id) {
        setSelectedConversation(null);
      }
      await loadConversations();
    } catch (e: any) {
      setError(e.message || "Failed to delete conversation");
    }
  }

  function handleStopGeneration() {
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
    }
    setIsStreaming(false);
    // Mark the last assistant message so retry button appears
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === "assistant") {
        updated[updated.length - 1] = { ...last, error: true } as any;
      }
      return updated;
    });
  }

  async function handleSendMessage(content: string) {
    if (!selectedRepo || !selectedConversation) return;

    if (content === "/clear") {
      try {
        const repo = repos.find((r) => r.repo_id === selectedRepo);
        const conv = await createConversation(selectedRepo, repo?.repo_name);
        await loadConversations();
        setSelectedConversation(conv.id);
      } catch (e: any) {
        setError(e.message || "Failed to clear conversation");
      }
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    const placeholderMessage: Message = {
      id: Date.now() + 1,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, placeholderMessage]);
    setIsStreaming(true);
    setCurrentChunks([]);
    tokenBufferRef.current = "";

    const abort = streamMessage(
      selectedRepo,
      content,
      selectedConversation,
      (event: StreamEvent) => {
        if (event.type === "token") {
          // Batch tokens via requestAnimationFrame
          tokenBufferRef.current += event.content;
          
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          
          rafRef.current = requestAnimationFrame(() => {
            const buffer = tokenBufferRef.current;
            tokenBufferRef.current = "";
            
            if (!buffer) return;
            
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + buffer };
              }
              return updated;
            });
          });
        } else if (event.type === "done") {
          // Flush any remaining buffer immediately
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          if (tokenBufferRef.current) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + tokenBufferRef.current };
              }
              return updated;
            });
            tokenBufferRef.current = "";
          }
          
          setIsStreaming(false);
          setCurrentChunks(event.chunks || []);
          setShowSources(true);
        } else if (event.type === "error") {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          tokenBufferRef.current = "";
          
          setIsStreaming(false);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: last.content || "Stream error", error: true } as any;
            }
            return updated;
          });
        }
      },
      (streamErr) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        tokenBufferRef.current = "";
        
        setIsStreaming(false);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: last.content || "Network error", error: true } as any;
          }
          return updated;
        });
      }
    );

    abortStreamRef.current = abort;
  }

  async function retryLastMessage() {
    if (!selectedRepo || !selectedConversation) return;

    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (!lastUserMsg) return;

    // Force reset streaming state
    setIsStreaming(false);
    
    // Remove the failed assistant message
    setMessages((prev) => prev.slice(0, -1));

    // Small delay to let state settle
    await new Promise(r => setTimeout(r, 50));

    const placeholder = {
      id: Date.now(),
      role: "assistant" as const,
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, placeholder]);

    setIsStreaming(true);
    setCurrentChunks([]);

  

    const abort = streamMessage(
      selectedRepo,
      lastUserMsg.content,
      selectedConversation,
      (event: StreamEvent) => {
        if (event.type === "token") {
          tokenBufferRef.current += event.content;
          
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          
          rafRef.current = requestAnimationFrame(() => {
            const buffer = tokenBufferRef.current;
            tokenBufferRef.current = "";
            
            if (!buffer) return;
            
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + buffer };
              }
              return updated;
            });
          });
        } else if (event.type === "done") {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          if (tokenBufferRef.current) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + tokenBufferRef.current };
              }
              return updated;
            });
            tokenBufferRef.current = "";
          }
          
          setIsStreaming(false);
          setCurrentChunks(event.chunks || []);
          setShowSources(true);
        } else if (event.type === "error") {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          tokenBufferRef.current = "";
          
          setIsStreaming(false);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, error: true } as any;
            }
            return updated;
          });
        }
      },
      (streamErr) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        tokenBufferRef.current = "";
        
        setIsStreaming(false);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, error: true } as any;
          }
          return updated;
        });
      }
    );

    abortStreamRef.current = abort;
  }

  async function handleQuickStart(query: string) {
    if (!selectedRepo) return;

    if (!selectedConversation) {
      try {
        const repo = repos.find((r) => r.repo_id === selectedRepo);
        const conv = await createConversation(selectedRepo, repo?.repo_name);
        await loadConversations();
        setSelectedConversation(conv.id);
        setTimeout(() => handleSendMessage(query), 200);
        return;
      } catch (e: any) {
        setError(e.message || "Failed to create conversation");
        return;
      }
    }

    handleSendMessage(query);
  }

  async function handleRepoSelect(repoId: string) {
    setSelectedRepo(repoId);
    setIndexingError(null);
  }

  async function handleIndexRepo(url: string) {
    setIsIndexing(true);
    setIndexingError(null);
    const repoName = url.split("/").pop() || "repository";
    setIndexingRepoName(repoName);

    try {
      const result = await indexRepo(url);
      const repoId = result.repo_id;

      const pollInterval = setInterval(async () => {
        try {
          const status = await getIndexingStatus(repoId);
          setIndexingProgress(status);
          if (status.stage === "complete") {
            clearInterval(pollInterval);
            await loadRepos();
            setSelectedRepo(repoId);
            setIsIndexing(false);
            setIndexingProgress(null);
            setSuccessToast("Repository indexed successfully");
          }
          if (status.stage === "error") {
            clearInterval(pollInterval);
            setIsIndexing(false);
            setIndexingError(status.error || "Indexing failed");
          }
        } catch {
          // Status not yet available
        }
      }, 500);
    } catch (e: any) {
      setIsIndexing(false);
      setIndexingError(e.message || "Failed to start indexing");
    }
  }

  async function handleUpdateRepo(repoId: string) {
    setIsIndexing(true);
    setIndexingProgress({ stage: "updating", message: "Pulling latest changes...", percent: 5 });
    setIndexingRepoName(repos.find(r => r.repo_id === repoId)?.repo_name || "repository");

    try {
      await updateRepo(repoId);

      const pollInterval = setInterval(async () => {
        try {
          const status = await getIndexingStatus(repoId);
          setIndexingProgress(status);
          if (status.stage === "complete") {
            clearInterval(pollInterval);
            await loadRepos();
            setIsIndexing(false);
            setIndexingProgress(null);
            setSuccessToast("Repository updated successfully");
          }
          if (status.stage === "error") {
            clearInterval(pollInterval);
            setIsIndexing(false);
            setIndexingError(status.error || "Update failed");
          }
        } catch {
          // Progress not available yet
        }
      }, 500);
    } catch (e: any) {
      setIsIndexing(false);
      setIndexingError(e.message || "Failed to update repository");
    }
  }

  function handleDeleteRepo(repoId: string) {
    setRepoToDelete(repoId);
    setDeleteModalOpen(true);
  }

  async function confirmDeleteRepo() {
    if (!repoToDelete) return;
    try {
      await deleteRepo(repoToDelete);
      if (selectedRepo === repoToDelete) setSelectedRepo(null);
      await loadRepos();
    } catch (e: any) {
      setError(e.message || "Failed to delete repository");
    } finally {
      setRepoToDelete(null);
    }
  }

  useKeyboardShortcuts({
    "cmd+k": handleNewChat,
    "cmd+b": () => {
      if (window.innerWidth < 1024) {
        setMobileSidebarOpen((p) => !p);
      } else {
        setSidebarOpen((p) => !p);
      }
    },
    "cmd+j": () => setShowSources((p) => !p),
    escape: () => {
      setShowSources(false);
      setMobileSidebarOpen(false);
    },
  });

  const selectedRepoData = repos.find((r) => r.repo_id === selectedRepo);

  // ─── Scroll handling ───
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      userScrolledRef.current = !isNearBottom;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    }

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages.length]);

  function scrollToBottom() {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
    userScrolledRef.current = false;
    setShowScrollButton(false);
  }

  // Auto-scroll: only if user hasn't manually scrolled up
  useEffect(() => {
    if (!messagesEndRef.current) return;
    if (!userScrolledRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" });
    }
  }, [messages.length, isStreaming]);

  return (
    <div className="h-screen bg-black text-white flex overflow-hidden">
      {error && <ErrorToast message={error} onClose={() => setError(null)} />}

      {successToast && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 shadow-xl">
            <Check size={16} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-medium">Success</p>
              <p className="text-[12px] text-emerald-300 mt-0.5">{successToast}</p>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-400/60 hover:text-emerald-400">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <MobileSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        repoId={selectedRepo}
        repoName={selectedRepoData?.repo_name}
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        onNewConversation={(id) => setSelectedConversation(id)}
      />

      <div
        className={`hidden lg:block h-full flex-shrink-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          sidebarOpen ? "w-72" : "w-14"
        }`}
      >
        {sidebarOpen ? (
          <div className="w-72 h-full">
            <Sidebar
              repoId={selectedRepo}
              repoName={selectedRepoData?.repo_name}
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
              onNewConversation={(id) => setSelectedConversation(id)}
            />
          </div>
        ) : (
          <IconRail
            onExpand={() => setSidebarOpen(true)}
            onNewChat={handleNewChat}
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversation}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[48%] z-10 text-[#484848] hover:text-[#b0b0b0] transition-colors duration-300"
        >
          {sidebarOpen ? (
            <svg width="52" height="24" viewBox="0 0 52 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="12" x2="44" y2="12" />
              <polyline points="14,4 4,12 14,20" />
            </svg>
          ) : (
            <svg width="52" height="24" viewBox="0 0 52 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="12" x2="48" y2="12" />
              <polyline points="38,4 48,12 38,20" />
            </svg>
          )}
        </button>

        <div className="h-12 flex items-center justify-between px-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 hover:bg-white/[0.06] rounded-lg text-[#636366] hover:text-white transition-colors"
            >
              <Menu size={16} />
            </button>

            <RepoSelector
              selectedRepo={selectedRepo}
              repos={repos}
              onSelect={handleRepoSelect}
              onIndex={handleIndexRepo}
              onDelete={handleDeleteRepo}
              isIndexing={isIndexing}
              indexingError={indexingError}
              indexingProgress={indexingProgress}
              onUpdate={handleUpdateRepo}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSources(!showSources)}
              disabled={currentChunks.length === 0}
              className={`p-1.5 rounded-lg transition-colors ${
                showSources
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-[#636366] hover:text-white hover:bg-white/[0.06]"
              } disabled:opacity-30`}
            >
              <FileCode size={16} />
            </button>
            {/*<Link
              href="/settings"
              className="p-1.5 hover:bg-white/[0.06] rounded-lg text-[#636366] hover:text-white transition-colors"
            >
              <Settings size={16} />
            </Link>*/}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            {messages.length === 0 ? (
              <div className="flex-1 overflow-y-auto">
                {!selectedRepo ? (
                  <EmptyState type="no-repo" />
                ) : isIndexing ? (
                  <EmptyState type="indexing" repoName={indexingRepoName} progress={indexingProgress} />
                ) : (
                  <EmptyState
                    type="ready"
                    repoName={selectedRepoData?.repo_name}
                    onQuickStart={handleQuickStart}
                  />
                )}
              </div>
            ) : (
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6 relative">
                {messages.map((msg, i) => (
                  <ChatMessage
                    key={msg.id || i}
                    role={msg.role as "user" | "assistant"}
                    content={msg.content}
                    chunks={msg.role === "assistant" && !isStreaming ? currentChunks : undefined}
                    isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                    createdAt={msg.created_at}
                    error={(msg as any).error === true}
                    onExpand={() => handleExpandMessage(msg.role, msg.content)}
                    onRetry={(msg as any).error ? handleRetry : undefined}
                    onDelete={() => handleDeleteMessage(i)}
                  />
                ))}
                <div ref={messagesEndRef} />

                {showScrollButton && (
                  <button
                    onClick={scrollToBottom}
                    className="sticky bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#1c1c1e] ring-1 ring-white/[0.1] flex items-center justify-center hover:bg-[#2c2c2e] transition-all shadow-lg z-10 mx-auto"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3,6 7,10 11,6" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            <div className="flex-shrink-0 pb-4">
              <ChatInput
                onSend={handleSendMessage}
                onStop={handleStopGeneration}
                disabled={!selectedRepo}
                isStreaming={isStreaming}
                placeholder={
                  !selectedRepo
                    ? "Select a repository first..."
                    : isStreaming
                    ? "Generating..."
                    : "Ask about the code..."
                }
              />
            </div>
          </div>

          {showSources && currentChunks.length > 0 && (
            <SourcePanel chunks={currentChunks} onClose={() => setShowSources(false)} />
          )}
        </div>
        {expandedMessage && (
          <div className="absolute inset-0 z-30 bg-[#0a0a0c] flex flex-col" onClick={() => setExpandedMessage(null)}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
              <span className="text-[13px] font-medium text-[#e5e5e7]">Response</span>
              <button onClick={() => setExpandedMessage(null)} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-[#636366] hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="max-w-3xl mx-auto text-[15px] text-[#e5e5e7] leading-relaxed">
                <ReactMarkdown
                  components={{
                    code({ children, className, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      const code = String(children).replace(/\n$/, "");
                      if (!props.inline && match) {
                        return (
                          <div className="my-3 rounded-xl overflow-hidden ring-1 ring-white/[0.08]">
                            <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0, padding: "1rem", fontSize: "0.8125rem", lineHeight: "1.6", background: "#0d1117" }}>
                              {code}
                            </SyntaxHighlighter>
                          </div>
                        );
                      }
                      return <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-[13px] font-mono text-[#e5e5e7]" {...props}>{children}</code>;
                    },
                    p({ children }: any) { return <p className="mb-3 last:mb-0">{children}</p>; },
                    ul({ children }: any) { return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>; },
                    ol({ children }: any) { return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>; },
                    li({ children }: any) { return <li className="text-[15px]">{children}</li>; },
                    strong({ children }: any) { return <strong className="font-semibold text-white">{children}</strong>; },
                    pre({ children }: any) { return <pre className="!bg-transparent !p-0 !m-0">{children}</pre>; },
                  }}
                >
                  {expandedMessage.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRepoToDelete(null);
        }}
        onConfirm={confirmDeleteRepo}
        title="Delete repository"
        message="This will remove the repository, all its chunks, and all conversations. This action cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
