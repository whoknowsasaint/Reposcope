"use client";

import React, { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Terminal, Bot, Copy, Check, FileCode, RotateCcw, Trash2, Maximize2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/time";

interface Chunk {
  file_path: string;
  start_line: number;
  end_line: number;
  name: string;
  chunk_type: string;
  content?: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  chunks?: Chunk[];
  isStreaming?: boolean;
  createdAt?: string;
  onSourceClick?: (chunk: Chunk) => void;
  error?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
  onExpand?: () => void;
}

function InlineCode({ children, className, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const match = /language-(\w+)/.exec(className || "");
  const isBlock = !props.inline && match;

  if (isBlock) {
    return (
      <div className="my-3 rounded-xl overflow-hidden ring-1 ring-white/[0.08]">
        <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <FileCode size={14} className="text-[#636366]" />
            <span className="text-[12px] text-[#8b949e] font-mono uppercase">{match[1]}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-[#636366] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1rem",
            fontSize: "0.8125rem",
            lineHeight: "1.6",
            background: "#0d1117",
          }}
          showLineNumbers={true}
          lineNumberStyle={{
            color: "#484f58",
            minWidth: "2.5em",
            paddingRight: "1em",
            fontSize: "0.75rem",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-[13px] font-mono text-[#e5e5e7] break-all" {...props}>
      {children}
    </code>
  );
}

function FileBadge({ chunk, onClick }: { chunk: Chunk; onClick?: () => void }) {
  const fileName = chunk.file_path.split("/").pop() || chunk.file_path;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[11px] font-mono ring-1 ring-blue-500/20 hover:ring-blue-500/30 transition-all"
    >
      <FileCode size={11} />
      <span className="truncate max-w-[200px]">{fileName}</span>
      <span className="text-blue-400/60">:{chunk.start_line}-{chunk.end_line}</span>
    </button>
  );
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  chunks,
  isStreaming,
  createdAt,
  onSourceClick,
  error,
  onRetry,
  onDelete,
  onExpand,
}: ChatMessageProps) {
  const isUser = role === "user";
  const [messageCopied, setMessageCopied] = useState(false);

  async function handleCopyMessage() {
    await navigator.clipboard.writeText(content);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2000);
  }

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end group">
        <div className="flex-1 min-w-0 flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={onDelete}
              className="p-0.5 hover:bg-white/[0.06] rounded text-[#484f58] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete message"
            >
              <Trash2 size={12} />
            </button>
            {createdAt && (
              <span className="text-[11px] text-[#484f58]">{formatRelativeTime(createdAt)}</span>
            )}
            <span className="text-[12px] text-[#636366] font-medium">You</span>
          </div>
          <div className="bg-[#1c1c1e] rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[85%]">
            <p className="text-[15px] text-[#e5e5e7] leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
        </div>
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#2997ff] flex items-center justify-center mt-0.5">
          <Terminal size={14} className="text-white" />
        </div>
      </div>
    );
  }

  if (isStreaming && !content) {
    return (
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center mt-0.5">
          <Bot size={14} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] text-emerald-400 font-medium">Reposcope</span>
          </div>
          <div className="bg-[#1c1c1e] rounded-2xl rounded-bl-md px-4 py-3 inline-block">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#636366] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#636366] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#636366] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center mt-0.5">
        <Bot size={14} className="text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[12px] text-emerald-400 font-medium">Reposcope</span>
          {createdAt && !isStreaming && (
            <span className="text-[11px] text-[#484f58]">{formatRelativeTime(createdAt)}</span>
          )}
          {isStreaming && (
            <span className="text-[11px] text-[#636366]">typing...</span>
          )}
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {error && onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[12px] font-medium transition-colors"
              >
                <RotateCcw size={11} />
                Retry
              </button>
            )}
            {!isStreaming && !error && content && (
              <>
                <button
                  onClick={onExpand}
                  className="p-1 hover:bg-white/[0.06] rounded text-[#484f58] hover:text-[#e5e5e7] transition-colors"
                  title="Expand"
                >
                  <Maximize2 size={14} />
                </button>
                <button
                  onClick={handleCopyMessage}
                  className="p-1 hover:bg-white/[0.06] rounded text-[#484f58] hover:text-[#e5e5e7] transition-colors"
                  title="Copy response"
                >
                  {messageCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <button
                  onClick={onDelete}
                  className="p-1 hover:bg-white/[0.06] rounded text-[#484f58] hover:text-red-400 transition-colors"
                  title="Delete message"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className={`bg-[#1c1c1e] rounded-2xl rounded-bl-md px-4 py-2.5 ${error ? "ring-1 ring-red-500/20" : ""}`}>
          {error ? (
            <p className="text-[15px] text-[#86868b] leading-relaxed">{content || "Network error. The response could not be loaded."}</p>
          ) : isStreaming ? (
            // PLAIN TEXT DURING STREAMING — no markdown parsing
            <div className="text-[15px] text-[#e5e5e7] leading-relaxed whitespace-pre-wrap">
              {content}
              <span className="inline-block w-[2px] h-[1em] bg-[#636366] ml-0.5 animate-pulse align-middle" />
            </div>
          ) : (
            // FULL MARKDOWN ONLY WHEN COMPLETE
            <div className="text-[15px] text-[#e5e5e7] leading-relaxed">
              <ReactMarkdown
                components={{
                  code: InlineCode,
                  p({ children }) {
                    return <p className="mb-3 last:mb-0">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="text-[15px]">{children}</li>;
                  },
                  strong({ children }) {
                    return <strong className="font-semibold text-white">{children}</strong>;
                  },
                  h3({ children }) {
                    return <h3 className="text-[16px] font-semibold text-white mt-4 mb-2">{children}</h3>;
                  },
                  h4({ children }) {
                    return <h4 className="text-[14px] font-semibold text-white mt-3 mb-1.5">{children}</h4>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-2 border-blue-500/30 pl-4 my-3 text-[#8b949e]">
                        {children}
                      </blockquote>
                    );
                  },
                  pre({ children }) {
                    return <pre className="!bg-transparent !p-0 !m-0">{children}</pre>;
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isStreaming && !error && chunks && chunks.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <FileCode size={12} className="text-[#636366]" />
              <span className="text-[11px] text-[#636366] font-medium uppercase tracking-wide">
                Referenced {chunks.length} source{chunks.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {chunks.map((chunk, i) => (
                <FileBadge key={i} chunk={chunk} onClick={() => onSourceClick?.(chunk)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
