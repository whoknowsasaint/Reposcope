"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Github,
  Copy,
  Check,
  Layers,
  Play,
  Pause,
  RotateCcw,
  GitBranch,
  FileCode,
  Database,
  Server,
  Search,
  ChevronRight,
  MessageSquare,
  Sparkles,
  FileText,
  Plus,
} from "lucide-react";

interface TerminalLine {
  type: "input" | "output" | "success" | "error" | "info";
  content: string;
  delay?: number;
  pipelineStep?: PipelineStep;
  fileInfo?: FileInFlight;
  stats?: IndexStats;
}
type PipelineStep = "clone" | "parse" | "chunk" | "embed" | "store" | null;
interface FileInFlight {
  name: string;
  language: string;
  lines: number;
  chunks: { type: string; lines: [number, number] }[];
}
interface IndexStats {
  filesDone: number;
  filesTotal: number;
  chunksDone: number;
  elapsedMs: number;
}
type PipelineState =
  | { phase: "idle" }
  | { phase: "running"; step: PipelineStep; file: FileInFlight; stats: IndexStats }
  | { phase: "complete"; totalFiles: number; totalChunks: number };

const ACCENT = "#5E6AD2";

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/[0.05] bg-[#08090a]/90 backdrop-blur-xl" : ""}`}>
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Reposcope logo" className="w-6 h-6 rounded-md" />
            <span className="text-[14px] font-semibold text-white tracking-tight">Reposcope</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {[{ label: "How it works", href: "#how-it-works" }, { label: "Features", href: "#features" }, { label: "Stack", href: "#stack" }].map((item) => (
              <a key={item.label} href={item.href} className="text-[13px] text-white/40 hover:text-white/80 transition-colors">{item.label}</a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/whoknowsasaint/reposcope" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5">
            <Github size={15} />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <Link href="/chat" className="px-4 py-1.5 rounded-lg text-[13px] font-medium text-white transition-all hover:opacity-90" style={{ backgroundColor: ACCENT }}>
            Launch App
          </Link>
        </div>
      </div>
    </nav>
  );
}

function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.04 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function AnimatedHeadline() {
  const words = ["grepping.", "searching.", "guessing.", "digging."];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % words.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <h1 className="text-[56px] sm:text-[76px] lg:text-[92px] font-semibold tracking-[-0.04em] leading-[1.0] mb-7">
      <span className="block">
        Stop{" "}
        <span className="relative inline-block" style={{ minWidth: "3ch" }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={words[index]}
              initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -28, filter: "blur(8px)" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block"
            >
              {words[index]}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
      <span className="block text-white/20">Start asking.</span>
    </h1>
  );
}

function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-[13px] text-white/25">
      <span className="font-mono">{num}</span>
      <span>{label}</span>
      <ArrowRight size={12} />
    </div>
  );
}

function ScreenshotWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative screenshot-desktop-clip ${className}`}>
      <div
        className="w-full rounded-2xl overflow-hidden border border-white/[0.15] will-change-transform transform-gpu"
        style={{
       boxShadow: `
        0 0 0 1px rgba(255,255,255,0.12),
        0 2px 8px rgba(0,0,0,0.2),
        0 8px 24px rgba(0,0,0,0.25),
        0 16px 48px rgba(0,0,0,0.3)
      ` }}
      >
        <div className="w-full rounded-2xl overflow-hidden border border-white/[0.10] will-change-transform transform-gpu">
          {children}
        </div>
      </div>
    </div>
  );
}

function HeroChatProduct() {
  return (
    <div className="relative pl-6 pr-0 sm:px-6 lg:px-16 no-mobile-padding">
      <ScreenshotWrapper>
        <div style={{ backgroundColor: "#0d0d0f" }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]" style={{ backgroundColor: "#09090b" }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono text-white/50 border border-white/[0.1]">&gt;_</div>
              <span className="text-[13px] font-semibold text-white/70">Reposcope</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[12px] text-white/40 font-mono" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
              <GitBranch size={11} className="text-white/30" />
              <span>vercel/next-learn</span>
              <ChevronRight size={10} className="text-white/20 rotate-90" />
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-white/30 border border-white/[0.07] hover:bg-white/[0.04] transition-colors">
                <Plus size={11} />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            </div>
          </div>

          <div className="flex" style={{ minHeight: "520px" }}>
            <div className="w-[220px] border-r border-white/[0.05] flex-shrink-0 hidden lg:flex flex-col" style={{ backgroundColor: "#09090b" }}>
              <div className="p-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-white/[0.06] text-[11px] text-white/20" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <Search size={11} />
                  <span>Search chats...</span>
                </div>
              </div>
              <div className="flex-1 p-3 space-y-0.5">
                {[
                  { label: "how does routing work?", active: true, time: "now" },
                  { label: "explain the data layer", active: false, time: "2m" },
                  { label: "auth flow walkthrough", active: false, time: "5m" },
                  { label: "middleware config", active: false, time: "12m" },
                ].map((chat, i) => (
                  <div key={i} className={`px-2.5 py-2 rounded-md cursor-pointer transition-colors ${chat.active ? "bg-white/[0.07]" : "hover:bg-white/[0.03]"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-mono truncate ${chat.active ? "text-white/70" : "text-white/30"}`}>{chat.label}</span>
                      <span className="text-[9px] text-white/15 flex-shrink-0 ml-2">{chat.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-white/[0.05]">
                <span className="text-[10px] text-white/15 font-mono">0 conversations</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 p-5 lg:p-8 space-y-6 overflow-hidden">
                <div className="flex justify-end">
                  <div className="max-w-[65%] px-4 py-3 rounded-2xl rounded-tr-sm text-[13px] text-white leading-relaxed" style={{ backgroundColor: ACCENT }}>
                    how does routing work in this repo?
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/[0.08]" style={{ backgroundColor: ACCENT + "20" }}>
                    <Sparkles size={13} style={{ color: ACCENT }} />
                  </div>
                  <div className="space-y-3 flex-1 min-w-0">
                    <p className="text-[13px] text-white/60 leading-relaxed">
                      Routing uses the{" "}
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ color: ACCENT, backgroundColor: ACCENT + "18" }}>App Router</span>
                      {" "}with file-system conventions. Dynamic segments use{" "}
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ color: ACCENT, backgroundColor: ACCENT + "18" }}>[param]</span>
                      {" "}folders.
                    </p>
                    <div className="rounded-xl border border-white/[0.06] p-4 font-mono text-[12px] leading-[1.8]" style={{ backgroundColor: "#050507" }}>
                      <div className="text-white/20 mb-2 text-[10px]">app/dashboard/page.tsx · lines 11-38</div>
                      <div><span style={{ color: "#c084fc" }}>export default</span> <span style={{ color: "#60a5fa" }}>async function</span> <span style={{ color: "#dcdcaa" }}>Page</span><span style={{ color: "#d4d4d4" }}>() {"{"}</span></div>
                      <div className="pl-4"><span style={{ color: "#c084fc" }}>const</span> <span style={{ color: "#9cdcfe" }}>data</span><span style={{ color: "#d4d4d4" }}> = </span><span style={{ color: "#c084fc" }}>await</span> <span style={{ color: "#dcdcaa" }}>fetchDashboard</span><span style={{ color: "#d4d4d4" }}>()</span></div>
                      <div className="pl-4"><span style={{ color: "#c084fc" }}>return</span><span style={{ color: "#d4d4d4" }}> &lt;</span><span style={{ color: "#4ec9b0" }}>Dashboard</span> <span style={{ color: "#9cdcfe" }}>data</span><span style={{ color: "#d4d4d4" }}>={"{data}"} /&gt;</span></div>
                      <div style={{ color: "#d4d4d4" }}>{"}"}</div>
                    </div>
                    <div className="text-[10px] text-white/20 font-mono">app/dashboard/page.tsx:11-38 · app/lib/data.ts:1-45</div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-[65%] px-4 py-3 rounded-2xl rounded-tr-sm text-[13px] text-white" style={{ backgroundColor: ACCENT }}>
                    what about auth?
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/[0.08]" style={{ backgroundColor: ACCENT + "20" }}>
                    <Sparkles size={13} style={{ color: ACCENT }} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[13px] text-white/60 leading-relaxed">
                      Auth uses{" "}
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ color: ACCENT, backgroundColor: ACCENT + "18" }}>NextAuth.js</span>
                      {" "}with JWT. Config in{" "}
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ color: ACCENT, backgroundColor: ACCENT + "18" }}>auth.ts</span>
                      {", "}protected routes go through{" "}
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ color: ACCENT, backgroundColor: ACCENT + "18" }}>middleware.ts</span>.
                    </p>
                    <div className="text-[10px] text-white/20 font-mono">auth.ts:23-45 · middleware.ts:12-18</div>
                  </div>
                </div>
              </div>

              <div className="px-4 lg:px-6 py-3 border-t border-white/[0.05]">
                <div className="flex items-end gap-2">
                  <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border border-white/[0.07]" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <span className="text-[13px] text-white/20 flex-1">Ask anything about the codebase...</span>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                    <ArrowRight size={14} className="text-white" />
                  </div>
                </div>
                <div className="mt-1.5 text-center">
                  <span className="text-[9px] text-white/15">Enter to send · Shift+Enter for new line</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScreenshotWrapper>
      <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, #08090a)" }} />
    </div>
  );
}

function VSCodeProduct({ view }: { view: "raw" | "chunked" }) {
  const codeLines = [
    'def _chunk_with_ast(content: str, file_path: str, language: str) -> List[CodeChunk]:',
    '    """Chunk code using tree-sitter AST."""',
    '    lang_module = _get_language_module(language)',
    '    if not lang_module:',
    '        return _simple_chunk(content, file_path)',
    '',
    '    parser = Parser(lang_module)',
    '    source_bytes = content.encode("utf8", errors="ignore")',
    '    tree = parser.parse(source_bytes)',
    '',
    '    query_str = QUERIES.get(language, "")',
    '    if not query_str:',
    '        return _simple_chunk(content, file_path)',
    '',
    '    query = Query(lang_module, query_str)',
    '    cursor = QueryCursor(query)',
    '    matches = cursor.matches(tree.root_node)',
    '',
    '    chunks = []',
    '    seen_ranges = set()',
    '',
    '    for pattern_idx, captures_dict in matches:',
    '        for capture_name in ("function", "class", "method"):',
    '            if capture_name not in captures_dict:',
    '                continue',
    '            for node in captures_dict[capture_name]:',
    '                start_line = node.start_point[0] + 1',
    '                end_line = node.end_point[0] + 1',
    '                range_key = (start_line, end_line)',
    '',
    '                if range_key in seen_ranges:',
    '                    continue',
    '                seen_ranges.add(range_key)',
    '',
    '                chunk_lines = content.split("\\n")[start_line - 1 : end_line]',
    '                chunk_content = "\\n".join(chunk_lines)',
    '',
    '                chunks.append(',
    '                    CodeChunk(',
    '                        content=chunk_content,',
    '                        file_path=file_path,',
    '                        start_line=start_line,',
    '                        end_line=end_line,',
    '                        chunk_type=capture_name,',
    '                        language=language,',
    '                    )',
    '                )',
    '',
    '    if not chunks:',
    '        return _simple_chunk(content, file_path)',
    '',
    '    return _fill_gaps(chunks, content, file_path, language)',
  ];
  const code = codeLines.join("\n");

  const chunkRanges = [
    { startLine: 0, endLine: 4, color: "#569cd6" },
    { startLine: 6, endLine: 8, color: "#4ec9b0" },
    { startLine: 10, endLine: 12, color: "#dcdcaa" },
    { startLine: 14, endLine: 16, color: "#ce9178" },
    { startLine: 18, endLine: 43, color: "#c586c0" },
    { startLine: 45, endLine: 49, color: "#9cdcfe" },
  ];

  const getLineHighlight = (lineIndex: number) => {
    if (view !== "chunked") return null;
    for (const chunk of chunkRanges) {
      if (lineIndex >= chunk.startLine && lineIndex <= chunk.endLine) return chunk.color;
    }
    return null;
  };

return (
  <div className="relative px-4 md:px-6 lg:px-8 overflow-visible">
    <div
      className="rounded-2xl sm:p-0 p-1 mx-auto"
      style={{
        width: "1150px",
        maxWidth: "none",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.2)"
      }}
    >
      <ScreenshotWrapper>
        <div style={{ backgroundColor: "#1e1e1e" }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/40" style={{ backgroundColor: "#323233" }}>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <FileText size={12} className="text-[#519aba]" />
                <span className="text-[11px] font-mono text-white/35">reposcope</span>
                <span className="text-white/15 text-[11px]">/</span>
                <span className="text-[11px] font-mono text-white/60">chunker.py</span>
              </div>
            </div>
            {view === "chunked" && (
              <div className="hidden sm:flex items-center gap-4">
                {[{ color: "#4ec9b0", label: "parser" }, { color: "#dcdcaa", label: "query" }, { color: "#c586c0", label: "extraction" }].map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: c.color + "80" }} />
                    <span className="text-[10px] font-mono" style={{ color: c.color + "99" }}>{c.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex">
            <div className="w-44 border-r border-white/[0.07] bg-[#252526] p-2.5 flex-shrink-0 hidden md:block">
              <div className="text-[9px] text-white/20 uppercase tracking-wider mb-2.5 font-mono px-1">WORKSPACE</div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-mono text-white/45"><span style={{ color: "#dcb862" }}>▾</span> web/</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-mono text-white/35 pl-4"><span style={{ color: "#dcb862" }}>▾</span> app/</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-mono text-white/30 pl-8"><span style={{ color: "#dcb862" }}>▸</span> chat/</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-mono text-white/30 pl-8"><span style={{ color: "#dcb862" }}>▸</span> settings/</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-mono text-white/30 pl-8"><span className="text-[#519aba]">·</span> globals.css</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-mono text-white/30 pl-8"><span className="text-[#519aba]">·</span> layout.tsx</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-mono text-white/30 pl-8"><span className="text-[#519aba]">·</span> page.tsx</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-mono text-white/35 pl-4"><span style={{ color: "#dcb862" }}>▾</span> components/</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-mono text-white/30 pl-8"><span className="text-[#519aba]">·</span> chat-message.tsx</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-mono text-white/30 pl-8"><span className="text-[#519aba]">·</span> sidebar.tsx</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-mono text-[#519aba] pl-8 rounded bg-white/[0.06]"><span className="text-[#519aba]">·</span> chunker.py</div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex">
                <div className="select-none text-right flex-shrink-0 py-4 pr-3 pl-4 border-r border-white/[0.05]" style={{ minWidth: "48px" }}>
                  {codeLines.map((_, i) => {
                    const highlight = getLineHighlight(i);
                    return (
                      <div key={i} className="font-mono text-[12px] leading-[22px] relative" style={{ color: highlight ? highlight + "bb" : "#4a4a4a" }}>
                        {view === "chunked" && highlight && (
                          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: highlight }} />
                        )}
                        {i + 1}
                      </div>
                    );
                  })}
                </div>

                {view === "chunked" && (
                  <div className="flex-shrink-0 py-4" style={{ width: "4px" }}>
                    {codeLines.map((_, i) => {
                      const color = getLineHighlight(i);
                      return (
                        <div key={i} style={{ height: "22px", backgroundColor: color ? color + "30" : "transparent", borderLeft: color ? `3px solid ${color}` : "3px solid transparent" }} />
                      );
                    })}
                  </div>
                )}

                <div className="flex-1 py-4 pl-3 pr-4 overflow-hidden">
                  <SyntaxHighlighter
                    language="python"
                    style={vscDarkPlus}
                    showLineNumbers={false}
                    wrapLines={true}
                    lineProps={(lineNumber: number) => {
                      const lineIndex = lineNumber - 1;
                      const highlight = getLineHighlight(lineIndex);
                      return {
                        style: {
                          backgroundColor: highlight ? `${highlight}12` : "transparent",
                          display: "block",
                          lineHeight: "22px",
                        },
                      };
                    }}
                    customStyle={{
                      margin: 0,
                      padding: 0,
                      background: "transparent",
                      fontSize: "12px",
                      lineHeight: "22px",
                    }}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-1 text-[10px] font-mono text-white/80" style={{ backgroundColor: ACCENT }}>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><GitBranch size={9} /> main</span>
              {view === "chunked" && <span>6 AST chunks detected</span>}
            </div>
            <div className="flex items-center gap-4"><span>Python</span><span>UTF-8</span><span>Ln {codeLines.length}, Col 0</span></div>
          </div>
        </div>
      </ScreenshotWrapper>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, #08090a)" }} />
  </div>
);
}

function TerminalProduct({ onStateChange }: { onStateChange?: (s: { currentLine: number; isPlaying: boolean; lines: TerminalLine[] }) => void }) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [copied, setCopied] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const hasLoopedRef = useRef(false);

  const scenario: TerminalLine[] = [
    { type: "input", content: "reposcope index https://github.com/vercel/next-learn", delay: 3000, pipelineStep: "clone", fileInfo: { name: "next-learn", language: "TypeScript", lines: 0, chunks: [] }, stats: { filesDone: 0, filesTotal: 246, chunksDone: 0, elapsedMs: 0 } },
    { type: "info", content: "Cloning repository...", delay: 5000, pipelineStep: "clone", fileInfo: { name: "package.json", language: "JSON", lines: 0, chunks: [] }, stats: { filesDone: 0, filesTotal: 246, chunksDone: 0, elapsedMs: 2300 } },
    { type: "info", content: "Receiving objects... done.", delay: 4000, pipelineStep: "clone", fileInfo: { name: "src/", language: "TypeScript", lines: 0, chunks: [] }, stats: { filesDone: 0, filesTotal: 246, chunksDone: 0, elapsedMs: 4800 } },
    { type: "info", content: "Checking out files... 246 done", delay: 3000, pipelineStep: "parse", fileInfo: { name: "dashboard/page.tsx", language: "TypeScript", lines: 47, chunks: [] }, stats: { filesDone: 1, filesTotal: 246, chunksDone: 0, elapsedMs: 6800 } },
    { type: "info", content: "Parsing AST with tree-sitter (TypeScript, TSX)...", delay: 6000, pipelineStep: "parse", fileInfo: { name: "dashboard/page.tsx", language: "TypeScript", lines: 47, chunks: [] }, stats: { filesDone: 1, filesTotal: 246, chunksDone: 0, elapsedMs: 11800 } },
    { type: "info", content: "Extracting functions, classes, methods... 564 nodes", delay: 5000, pipelineStep: "chunk", fileInfo: { name: "dashboard/page.tsx", language: "TypeScript", lines: 47, chunks: [{ type: "function", lines: [1, 18] }, { type: "class", lines: [20, 35] }, { type: "import", lines: [37, 40] }] }, stats: { filesDone: 1, filesTotal: 246, chunksDone: 0, elapsedMs: 15300 } },
    { type: "info", content: "Splitting by AST boundaries... 564 chunks", delay: 4000, pipelineStep: "chunk", fileInfo: { name: "dashboard/page.tsx", language: "TypeScript", lines: 47, chunks: [{ type: "function", lines: [1, 18] }, { type: "class", lines: [20, 35] }, { type: "import", lines: [37, 40] }] }, stats: { filesDone: 1, filesTotal: 246, chunksDone: 564, elapsedMs: 18300 } },
    { type: "info", content: "Embedding with jina-embeddings-v3... batch 1/12", delay: 7000, pipelineStep: "embed", fileInfo: { name: "dashboard/page.tsx", language: "TypeScript", lines: 47, chunks: [{ type: "function", lines: [1, 18] }, { type: "class", lines: [20, 35] }, { type: "import", lines: [37, 40] }] }, stats: { filesDone: 1, filesTotal: 246, chunksDone: 564, elapsedMs: 24300 } },
    { type: "info", content: "Embedding... batch 12/12", delay: 5000, pipelineStep: "embed", fileInfo: { name: "dashboard/page.tsx", language: "TypeScript", lines: 47, chunks: [{ type: "function", lines: [1, 18] }, { type: "class", lines: [20, 35] }, { type: "import", lines: [37, 40] }] }, stats: { filesDone: 1, filesTotal: 246, chunksDone: 564, elapsedMs: 28300 } },
    { type: "info", content: "Persisting vectors to ChromaDB...", delay: 4000, pipelineStep: "store", fileInfo: { name: "dashboard/page.tsx", language: "TypeScript", lines: 47, chunks: [{ type: "function", lines: [1, 18] }, { type: "class", lines: [20, 35] }, { type: "import", lines: [37, 40] }] }, stats: { filesDone: 246, filesTotal: 246, chunksDone: 564, elapsedMs: 31800 } },
    { type: "success", content: "Indexed 246 files -> 564 chunks in 38.2s", delay: 4000, pipelineStep: "store", fileInfo: { name: "dashboard/page.tsx", language: "TypeScript", lines: 47, chunks: [{ type: "function", lines: [1, 18] }, { type: "class", lines: [20, 35] }, { type: "import", lines: [37, 40] }] }, stats: { filesDone: 246, filesTotal: 246, chunksDone: 564, elapsedMs: 38200 } },
    { type: "input", content: 'reposcope ask "how does routing work?"', delay: 2000 },
    { type: "output", content: "Routing uses the App Router with file-system based routing.", delay: 1500 },
    { type: "output", content: "Dynamic routes use [param] folders.", delay: 1500 },
    { type: "info", content: "", delay: 800 },
    { type: "info", content: "app/dashboard/page.tsx:11-38", delay: 700 },
    { type: "info", content: "app/api/route.ts:23-67", delay: 700 },
  ];

  const reset = useCallback(() => { setLines([]); setCurrentLine(0); setIsPlaying(true); hasLoopedRef.current = false; }, []);

  useEffect(() => {
    if (!isPlaying || currentLine >= scenario.length) return;
    const t = setTimeout(() => { setLines((p) => [...p, scenario[currentLine]]); setCurrentLine((p) => p + 1); }, scenario[currentLine].delay ?? 2000);
    return () => clearTimeout(t);
  }, [currentLine, isPlaying]);

  useEffect(() => {
    if (currentLine >= scenario.length && isPlaying && !hasLoopedRef.current) {
      hasLoopedRef.current = true;
      const t = setTimeout(() => reset(), 70000);
      return () => clearTimeout(t);
    }
  }, [currentLine, isPlaying, reset]);

  useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [lines]);
  useEffect(() => { onStateChange?.({ currentLine, isPlaying, lines }); }, [currentLine, isPlaying, lines, onStateChange]);

  const lineColor = (type: TerminalLine["type"]) => {
    if (type === "input") return "text-white";
    if (type === "success") return "text-[#4ade80]";
    if (type === "error") return "text-[#f87171]";
    if (type === "info") return "text-white/25";
    return "text-white/60";
  };

  return (
    <div className="relative pl-6 pr-0 sm:px-6 lg:px-16 no-mobile-padding">
      <ScreenshotWrapper>
        <div style={{ backgroundColor: "#111113" }}>
          <div className="flex items-center px-5 py-3.5 border-b border-white/[0.06]" style={{ backgroundColor: "#0c0c0e" }}>
            <div className="flex items-center gap-1.5 mr-4">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
            </div>
            <div className="flex-1 text-center"><span className="text-[12px] text-white/20 font-mono">reposcope — zsh</span></div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPlaying((p) => !p)} className="text-white/20 hover:text-white/50 transition-colors">{isPlaying ? <Pause size={13} /> : <Play size={13} />}</button>
              <button onClick={reset} className="text-white/20 hover:text-white/50 transition-colors"><RotateCcw size={13} /></button>
            </div>
          </div>
          <div ref={terminalRef} className="p-6 h-[280px] overflow-y-auto font-mono text-[13px] leading-[1.8]" style={{ scrollbarWidth: "none" }}>
            <div className="text-white/20 mb-1">$ reposcope list</div>
            <div className="text-white/20 mb-1">Indexed repositories:</div>
            <div className="mb-5" style={{ color: ACCENT }}>{"  "}&#10003; next-learn (5ebac083)</div>
            {lines.map((line, i) => (
              <div key={i} className={`${lineColor(line.type)} mb-0.5`}>
                {line.type === "input" && <span className="text-white/30">$ </span>}
                {line.content}
              </div>
            ))}
            {isPlaying && currentLine < scenario.length && <span className="text-white/40 animate-pulse">&#9608;</span>}
          </div>
        </div>
      </ScreenshotWrapper>

      <div className="mt-5">
        <p className="text-[11px] text-white/25 uppercase tracking-widest font-mono mb-2 px-1">Get started in 30 seconds</p>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.1] font-mono text-[13px] sm:text-[14px]"
            style={{ backgroundColor: "rgba(94,106,210,0.08)", borderColor: ACCENT + "40" }}
          >
            <span style={{ color: ACCENT + "80" }}>$</span>
            <span className="text-white/70 select-all">git clone https://github.com/whoknowsasaint/reposcope</span>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText("git clone https://github.com/whoknowsasaint/reposcope"); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex items-center gap-2 px-4 py-3.5 rounded-xl border border-white/[0.1] hover:bg-white/[0.06] transition-colors text-[12px] font-medium flex-shrink-0"
            style={{ borderColor: copied ? ACCENT + "60" : undefined, color: copied ? ACCENT : "rgba(255,255,255,0.4)" }}
          >
            {copied ? <><Check size={14} /><span className="hidden sm:inline">Copied!</span></> : <><Copy size={14} /><span className="hidden sm:inline">Copy</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function PipelineProduct({ state }: { state: PipelineState }) {
  const stations: { id: "clone" | "parse" | "chunk" | "embed" | "store"; label: string; icon: React.ElementType; desc: string }[] = [
    { id: "clone", label: "Clone", icon: GitBranch, desc: "Download" },
    { id: "parse", label: "Parse", icon: Layers, desc: "Build AST" },
    { id: "chunk", label: "Chunk", icon: FileCode, desc: "Split" },
    { id: "embed", label: "Embed", icon: Database, desc: "Vectors" },
    { id: "store", label: "Store", icon: Server, desc: "Persist" },
  ];
  const stepOrder = ["clone", "parse", "chunk", "embed", "store"];
  const getStatus = (id: string) => {
    if (state.phase === "idle") return "idle";
    if (state.phase === "complete") return "done";
    if (state.phase !== "running") return "idle";
    const cur = stepOrder.indexOf(state.step ?? "");
    const idx = stepOrder.indexOf(id);
    if (idx < cur) return "done";
    if (idx === cur) return "active";
    return "idle";
  };
  const getProgress = () => {
    if (state.phase === "idle") return 0;
    if (state.phase === "complete") return 100;
    if (state.phase !== "running" || !state.step) return 0;
    return ((stepOrder.indexOf(state.step) + 0.5) / stepOrder.length) * 100;
  };

  return (
    <div className="relative pl-6 pr-0 sm:px-6 lg:px-16 no-mobile-padding">
      <ScreenshotWrapper>
        <div style={{ backgroundColor: "#111113" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]" style={{ backgroundColor: "#0c0c0e" }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: state.phase === "complete" ? ACCENT : state.phase === "running" ? "#fbbf24" : "rgba(255,255,255,0.15)" }} />
              <span className="text-[11px] font-mono text-white/30 uppercase tracking-widest">
                {state.phase === "idle" ? "Standby" : state.phase === "running" ? "Processing" : "Complete"}
              </span>
            </div>
            <span className="text-[11px] font-mono text-white/20">
              {state.phase === "running" && <><span style={{ color: ACCENT }}>{state.stats.filesDone}</span>/{state.stats.filesTotal} files</>}
              {state.phase === "complete" && <span style={{ color: ACCENT }}>246 files · 564 chunks</span>}
            </span>
          </div>

          <div className="px-4 sm:px-8 py-8 sm:py-10 relative overflow-hidden">
            <div className="relative flex items-start justify-between min-w-[480px]">
              <div className="absolute left-0 right-0 top-[28px] h-px bg-white/[0.06]" />
              <motion.div
                className="absolute left-0 top-[28px] h-px"
                style={{ backgroundColor: ACCENT + "80" }}
                initial={{ width: "0%" }}
                animate={{ width: `${getProgress()}%` }}
                transition={{ duration: 2.5, ease: "easeInOut" }}
              />
              {stations.map((s) => {
                const st = getStatus(s.id);
                const Icon = s.icon;
                return (
                  <div key={s.id} className="flex flex-col items-center gap-3 relative z-10">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300"
                      style={{
                        backgroundColor: st === "done" || st === "active" ? ACCENT + "18" : "rgba(255,255,255,0.03)",
                        borderColor: st === "done" || st === "active" ? ACCENT + "50" : "rgba(255,255,255,0.07)",
                      }}
                    >
                      {st === "done" ? <Check size={20} style={{ color: ACCENT }} /> : <Icon size={20} className={st === "active" ? "text-white/70" : "text-white/15"} />}
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-[13px] font-medium ${st === "idle" ? "text-white/20" : "text-white/80"}`}>{s.label}</span>
                      <span className="text-[11px] text-white/20">{s.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mx-4 sm:mx-6 mb-5 rounded-xl border border-white/[0.05] px-5 py-4 font-mono text-[12px] sm:text-[13px]" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
            {state.phase === "idle" && <span className="text-white/20">Run the terminal above to watch the pipeline live.</span>}
            {state.phase === "running" && state.file && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-white/40">{state.file.name}</span>
                <span className="text-white/15">→</span>
                <span style={{ color: ACCENT }}>
                  {state.step === "clone" && "downloading..."}
                  {state.step === "parse" && "building AST..."}
                  {state.step === "chunk" && `${state.file.chunks.length} chunks`}
                  {state.step === "embed" && `${state.file.chunks.length} vectors`}
                  {state.step === "store" && "persisting..."}
                </span>
                <div className="ml-auto w-20 h-0.5 bg-white/[0.07] rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: ACCENT }} animate={{ width: ["0%", "100%"] }} transition={{ duration: 4, ease: "easeInOut" }} />
                </div>
              </div>
            )}
            {state.phase === "complete" && <span style={{ color: ACCENT }}>&#10003; 564 chunks indexed · ready for semantic search</span>}
          </div>
        </div>
      </ScreenshotWrapper>
      <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, #08090a)" }} />
    </div>
  );
}

function StackGrid() {
  const items = [
    { label: "Backend", value: "FastAPI + Uvicorn" },
    { label: "Vectors", value: "ChromaDB" },
    { label: "Embeddings", value: "Jina AI v3" },
    { label: "LLM", value: "Groq Llama 3.3" },
    { label: "Frontend", value: "Next.js 14" },
    { label: "Parsing", value: "tree-sitter" },
    { label: "Storage", value: "SQLite + Chroma" },
    { label: "Streaming", value: "Server-Sent Events" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item, i) => (
        <FadeIn key={i} delay={i * 40}>
          <div className="px-5 py-4 rounded-xl border border-white/[0.05] hover:bg-white/[0.04] transition-colors" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
            <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">{item.label}</div>
            <div className="text-[14px] text-white/65 font-medium">{item.value}</div>
          </div>
        </FadeIn>
      ))}
    </div>
  );
}

export default function Home() {
  const [pipelineState, setPipelineState] = useState<PipelineState>({ phase: "idle" });
  const [codeView, setCodeView] = useState<"raw" | "chunked">("raw");

  const handleTerminalState = useCallback(
    (s: { currentLine: number; isPlaying: boolean; lines: TerminalLine[] }) => {
      const last = s.lines[s.lines.length - 1];
      if (!s.isPlaying) { setPipelineState({ phase: "idle" }); return; }
      if (last?.pipelineStep) {
        setPipelineState({
          phase: "running",
          step: last.pipelineStep,
          file: last.fileInfo ?? { name: "unknown", language: "TypeScript", lines: 0, chunks: [] },
          stats: last.stats ?? { filesDone: 0, filesTotal: 246, chunksDone: 0, elapsedMs: 0 },
        });
      } else if (s.currentLine >= 11) {
        setPipelineState({ phase: "complete", totalFiles: 246, totalChunks: 564 });
      }
    }, []
  );

  return (
    <main className="min-h-screen bg-[#08090a] text-white overflow-x-hidden selection:bg-white/10">
      <Nav />

      <section className="pt-32 pb-0 overflow-x-hidden">
        <div className="max-w-3xl mx-auto px-6 text-center mb-16">
          <FadeIn>
            <div className="inline-flex items-center gap-2 mb-7 px-3 py-1.5 rounded-full border border-white/[0.07] text-[12px] text-white/35" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />
              Open source · MIT License
            </div>
            <AnimatedHeadline />
            <p className="text-[18px] sm:text-[20px] text-white/35 leading-relaxed mb-10 max-w-lg mx-auto">
              Index any GitHub repo and chat with your codebase in plain English. Precise answers with file references and line numbers.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/chat" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-medium text-white transition-all hover:opacity-90 group" style={{ backgroundColor: ACCENT }}>
                Launch App <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="https://github.com/whoknowsasaint/reposcope" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-medium text-white/40 hover:text-white/70 border border-white/[0.08] hover:border-white/[0.15] transition-all">
                <Github size={15} /> GitHub
              </a>
            </div>
          </FadeIn>
        </div>
        <FadeIn delay={200}>
          <HeroChatProduct />
        </FadeIn>
      </section>

      <section className="pt-32 pb-24 border-t border-white/[0.04] overflow-x-hidden">
        <div className="max-w-3xl mx-auto px-6 text-center mb-16">
          <FadeIn>
            <SectionLabel num="1.0" label="Index" />
            <h2 className="text-[40px] sm:text-[56px] font-semibold tracking-[-0.03em] mt-4 mb-4">Index from the CLI.</h2>
            <p className="text-[17px] text-white/35 leading-relaxed max-w-md mx-auto">One command. Automate in CI. Any public or private repo.</p>
          </FadeIn>
        </div>
        <FadeIn delay={100}>
          <TerminalProduct onStateChange={handleTerminalState} />
        </FadeIn>
      </section>

      <section id="how-it-works" className="pt-32 pb-24 border-t border-white/[0.04] overflow-x-hidden">
        <div className="max-w-3xl mx-auto px-6 text-center mb-16">
          <FadeIn>
            <SectionLabel num="2.0" label="Pipeline" />
            <h2 className="text-[40px] sm:text-[56px] font-semibold tracking-[-0.03em] mt-4 mb-4">Pipeline you can inspect.</h2>
            <p className="text-[17px] text-white/35 leading-relaxed max-w-md mx-auto">Every stage transparent. Watch your code travel from raw files to searchable vectors.</p>
          </FadeIn>
        </div>
        <FadeIn delay={100}>
          <PipelineProduct state={pipelineState} />
        </FadeIn>
      </section>

      <section id="features" className="pt-32 pb-24 border-t border-white/[0.04] overflow-x-hidden">
        <div className="max-w-3xl mx-auto px-6 text-center mb-12">
          <FadeIn>
            <SectionLabel num="3.0" label="Chunking" />
            <h2 className="text-[40px] sm:text-[56px] font-semibold tracking-[-0.03em] mt-4 mb-4">
              Split by structure,<br />
              <span className="text-white/20">not line count.</span>
            </h2>
            <p className="text-[17px] text-white/35 leading-relaxed max-w-xl mx-auto">
              Traditional RAG splits every N lines, breaking functions mid-body. tree-sitter chunks at AST boundaries — each chunk is a complete semantic unit.
            </p>
          </FadeIn>
        </div>
        <FadeIn delay={80}>
          <div className="flex items-center justify-center gap-2 mb-8">
            {(["raw", "chunked"] as const).map((v) => (
              <button key={v} onClick={() => setCodeView(v)}
                className={`px-5 py-2 rounded-lg text-[13px] font-mono transition-all border ${codeView === v ? "text-white border-white/[0.15] bg-white/[0.08]" : "text-white/30 border-transparent hover:text-white/50"}`}>
                {v === "raw" ? "Raw file" : "AST chunks"}
              </button>
            ))}
          </div>
        </FadeIn>
        <FadeIn delay={150}>
          <VSCodeProduct view={codeView} />
        </FadeIn>
        <FadeIn delay={200}>
          <div className="max-w-3xl mx-auto px-6 mt-16 grid sm:grid-cols-3 gap-8 text-center">
            {[
              { stat: "8+", label: "Languages", sub: "Python, TS, Go, Rust, Java..." },
              { stat: "564", label: "Chunks", sub: "from 246 files on vercel/next-learn" },
              { stat: "100%", label: "Boundary-aware", sub: "Every chunk a complete unit" },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-[44px] font-semibold tracking-tight mb-1" style={{ color: ACCENT }}>{item.stat}</div>
                <div className="text-[14px] text-white/55 font-medium mb-0.5">{item.label}</div>
                <div className="text-[12px] text-white/20">{item.sub}</div>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      <section id="stack" className="pt-32 pb-24 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-start">
            <FadeIn>
              <SectionLabel num="4.0" label="Stack" />
              <h2 className="text-[40px] sm:text-[56px] font-semibold tracking-[-0.03em] mt-4 mb-4">
                Runs on your<br /><span className="text-white/20">machine.</span>
              </h2>
              <p className="text-[16px] text-white/35 leading-relaxed mb-8 max-w-md">
                No SaaS lock-in. ChromaDB stores vectors locally. SQLite keeps conversation history. Your code never leaves your computer.
              </p>
              <Link href="/chat" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium text-white transition-all hover:opacity-90" style={{ backgroundColor: ACCENT }}>
                Get Started <ChevronRight size={14} />
              </Link>
            </FadeIn>
            <FadeIn delay={150}><StackGrid /></FadeIn>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-white/[0.04]">
        <div className="max-w-xl mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-[44px] sm:text-[60px] font-semibold tracking-[-0.04em] mb-6">
              Stop grepping.<br /><span className="text-white/20">Start asking.</span>
            </h2>
            <p className="text-[17px] text-white/30 mb-10 leading-relaxed">Clone the repo, install dependencies, start chatting in under five minutes.</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/chat" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-medium text-white transition-all hover:opacity-90 group" style={{ backgroundColor: ACCENT }}>
                Launch Web UI <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="https://github.com/whoknowsasaint/reposcope" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-medium text-white/40 hover:text-white/70 border border-white/[0.08] hover:border-white/[0.15] transition-all">
                <Github size={16} /> View Source
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      <footer className="py-10 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Reposcope logo" className="w-5 h-5 rounded" />
            <span className="text-[13px] font-semibold text-white/60">Reposcope</span>
          </div>
          <div className="flex items-center gap-6 text-[12px] text-white/20">
            <a href="https://github.com/whoknowsasaint/reposcope" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">GitHub</a>
            <Link href="/chat" className="hover:text-white/50 transition-colors">Web UI</Link>
          </div>
          <p className="text-[11px] text-white/15">MIT · FastAPI · Next.js · ChromaDB · tree-sitter</p>
        </div>
      </footer>
    </main>
  );
}