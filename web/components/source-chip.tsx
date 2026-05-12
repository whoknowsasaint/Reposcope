"use client";

import { useState, useCallback } from "react";
import { FileCode, ChevronDown, ChevronUp, ExternalLink, Copy, Check, GitBranch } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface SourceChipProps {
  file_path: string;
  start_line: number;
  end_line: number;
  name: string;
  chunk_type: string;
  content?: string;
  repoUrl?: string;
  score?: number;
}

const LANG_MAP: Record<string, string> = {
  py: "python", pyi: "python", pyc: "python",
  js: "javascript", mjs: "javascript", cjs: "javascript",
  jsx: "jsx",
  ts: "typescript", mts: "typescript", cts: "typescript",
  tsx: "tsx",
  go: "go",
  rs: "rust",
  java: "java",
  cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", h: "c",
  c: "c",
  rb: "ruby", erb: "ruby",
  php: "php",
  swift: "swift",
  kt: "kotlin", kts: "kotlin",
  scala: "scala",
  r: "r",
  md: "markdown", mdx: "markdown",
  json: "json", jsonc: "json",
  yaml: "yaml", yml: "yaml",
  toml: "toml",
  dockerfile: "dockerfile",
  sh: "bash", bash: "bash", zsh: "bash", fish: "bash",
  sql: "sql",
  graphql: "graphql",
  css: "css", scss: "scss", sass: "scss", less: "less",
  html: "html", htm: "html",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  prisma: "prisma",
  proto: "protobuf",
};

function detectLanguage(filePath: string): string {
  const parts = filePath.split(".");
  if (parts.length < 2) return "text";
  
  // Handle compound extensions like .d.ts, .test.ts
  const ext = parts.pop()?.toLowerCase() || "";
  const secondExt = parts.pop()?.toLowerCase();
  
  if (ext === "ts" && secondExt === "d") return "typescript";
  if (LANG_MAP[ext]) return LANG_MAP[ext];
  
  // Check for Dockerfile, Makefile, etc.
  const basename = filePath.split("/").pop()?.toLowerCase() || "";
  if (basename.startsWith("dockerfile")) return "dockerfile";
  if (basename === "makefile") return "makefile";
  if (basename === "nginx.conf") return "nginx";
  
  return "text";
}

function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    python: "text-yellow-400",
    javascript: "text-yellow-300",
    typescript: "text-blue-400",
    tsx: "text-blue-300",
    go: "text-cyan-400",
    rust: "text-orange-400",
    java: "text-red-400",
    cpp: "text-pink-400",
    ruby: "text-red-500",
    php: "text-indigo-400",
    swift: "text-orange-300",
    kotlin: "text-purple-400",
  };
  return colors[lang] || "text-[#8b949e]";
}

export function SourceChip({
  file_path,
  start_line,
  end_line,
  name,
  chunk_type,
  content,
  repoUrl,
  score,
}: SourceChipProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const language = detectLanguage(file_path);
  const langColor = getLanguageColor(language);
  const fileName = file_path.split("/").pop() || file_path;
  const dirPath = file_path.split("/").slice(0, -1).join("/");
  const lineCount = end_line - start_line + 1;
  const isLarge = content && content.split("\n").length > 50;

  const handleCopy = useCallback(async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const githubLink = repoUrl
    ? `${repoUrl}/blob/main/${file_path}#L${start_line}-L${end_line}`
    : null;

  return (
    <div className="rounded-xl overflow-hidden ring-1 ring-white/[0.06] bg-[#0d1117]">
      {/* Header — Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left group"
      >
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronUp size={16} className="text-[#636366]" />
          ) : (
            <ChevronDown size={16} className="text-[#636366]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[13px] font-mono ${langColor}`}>
              {language}
            </span>
            <span className="text-[11px] text-[#636366] font-medium uppercase tracking-wide">
              {chunk_type}
            </span>

          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#8b949e] font-mono">
            <span className="truncate">{dirPath}/</span>
            <span className="text-[#e5e5e7] font-medium">{fileName}</span>
            <span className="text-[#636366] flex-shrink-0">
              :{start_line}-{end_line}
            </span>
            <span className="text-[#484f58] flex-shrink-0">
              ({lineCount} lines)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {githubLink && (
            <a
              href={githubLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-white/[0.06] rounded-md text-[#636366] hover:text-white transition-colors"
              title="View on GitHub"
            >
              <ExternalLink size={14} />
            </a>
          )}
          {content && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="p-1.5 hover:bg-white/[0.06] rounded-md text-[#636366] hover:text-white transition-colors"
              title="Copy code"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && content && (
        <div className="border-t border-white/[0.06]">
          {/* Code Preview / Full */}
          <div className="relative">
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: "1rem",
                fontSize: "0.8125rem",
                lineHeight: "1.6",
                background: "#0a0a0f",
                maxHeight: showFull ? "none" : "300px",
                overflow: "auto",
              }}
              showLineNumbers={true}
              startingLineNumber={start_line}
              lineNumberStyle={{
                color: "#484f58",
                minWidth: "3em",
                paddingRight: "1em",
                fontSize: "0.75rem",
              }}
            >
              {content}
            </SyntaxHighlighter>

            {/* Fade overlay for truncated content */}
            {!showFull && isLarge && (
              <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-t border-white/[0.06]">
            <div className="flex items-center gap-3 text-[11px] text-[#636366]">
              <span>{content.split("\n").length} lines</span>
              <span>{content.length.toLocaleString()} bytes</span>
              <span className="text-[#484f58]">chunk: {name}</span>
            </div>
            {isLarge && (
              <button
                onClick={() => setShowFull(!showFull)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                {showFull ? "Show less" : "Show all"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {expanded && !content && (
        <div className="px-4 py-6 text-center border-t border-white/[0.06]">
          <FileCode size={20} className="text-[#484f58] mx-auto mb-2" />
          <p className="text-[13px] text-[#636366]">Content not loaded</p>
          <p className="text-[12px] text-[#484f58] mt-1">
            {file_path}:{start_line}-{end_line}
          </p>
        </div>
      )}
    </div>
  );
}
