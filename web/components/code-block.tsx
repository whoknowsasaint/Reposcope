"use client";

import { useState, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Copy,
  Check,
  ExternalLink,
  WrapText,
  ListOrdered,
  FileCode,
  GitBranch,
} from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  filePath?: string;
  lineStart?: number;
  repoUrl?: string;
  showLineNumbersDefault?: boolean;
}

export function CodeBlock({
  code,
  language = "typescript",
  filePath,
  lineStart = 1,
  repoUrl,
  showLineNumbersDefault = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(showLineNumbersDefault);

  const lineCount = code.split("\n").length;
  const shouldShowLineNumbers = showLineNumbers && lineCount > 1;
  const fileName = filePath?.split("/").pop();
  const dirPath = filePath?.split("/").slice(0, -1).join("/");

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const githubLink =
    repoUrl && filePath
      ? `${repoUrl}/blob/main/${filePath}#L${lineStart}-L${lineStart + lineCount - 1}`
      : null;

  return (
    <div className="my-3 rounded-xl overflow-hidden ring-1 ring-white/[0.08] bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <FileCode size={14} className="text-[#636366] flex-shrink-0" />

          {filePath ? (
            <div className="flex items-center gap-1 text-[12px] font-mono min-w-0">
              {dirPath && (
                <span className="text-[#484f58] truncate">{dirPath}/</span>
              )}
              <span className="text-[#8b949e] font-medium truncate">
                {fileName}
              </span>
              <span className="text-[#484f58] flex-shrink-0">
                :{lineStart}-{lineStart + lineCount - 1}
              </span>
            </div>
          ) : (
            <span className="text-[12px] text-[#8b949e] font-mono uppercase">
              {language}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Word wrap toggle */}
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1.5 rounded-md transition-colors ${
              wordWrap
                ? "bg-white/[0.08] text-white"
                : "text-[#636366] hover:text-white hover:bg-white/[0.06]"
            }`}
            title="Toggle word wrap"
          >
            <WrapText size={13} />
          </button>

          {/* Line numbers toggle */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`p-1.5 rounded-md transition-colors ${
              shouldShowLineNumbers
                ? "bg-white/[0.08] text-white"
                : "text-[#636366] hover:text-white hover:bg-white/[0.06]"
            }`}
            title="Toggle line numbers"
          >
            <ListOrdered size={13} />
          </button>

          {githubLink && (
            <a
              href={githubLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-white/[0.06] rounded-md text-[#636366] hover:text-white transition-colors"
              title="View on GitHub"
            >
              <GitBranch size={13} />
            </a>
          )}

          {/* Copy button with feedback */}
          <button
            onClick={handleCopy}
            className={`relative p-1.5 rounded-md transition-all ${
              copied
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-[#636366] hover:text-white hover:bg-white/[0.06]"
            }`}
            title={copied ? "Copied!" : "Copy code"}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            
            {/* Toast */}
            {copied && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[11px] rounded-md whitespace-nowrap ring-1 ring-emerald-500/20">
                Copied!
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
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
            whiteSpace: wordWrap ? "pre-wrap" : "pre",
            wordBreak: wordWrap ? "break-all" : "normal",
          }}
          showLineNumbers={shouldShowLineNumbers}
          startingLineNumber={lineStart}
          lineNumberStyle={{
            color: "#484f58",
            minWidth: "3em",
            paddingRight: "1em",
            fontSize: "0.75rem",
            textAlign: "right",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-[#161b22] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#484f58]">
        <span>
          {lineCount} line{lineCount !== 1 ? "s" : ""} · {code.length.toLocaleString()} bytes
        </span>
        <span className="font-mono uppercase">{language}</span>
      </div>
    </div>
  );
}
