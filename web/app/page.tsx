"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Github,
  Terminal,
  Copy,
  Check,
  Layers,
  Zap,
  Lock,
  Play,
  Pause,
  RotateCcw,
  GitBranch,
  FileCode,
  Database,
  Server,
  Code2,
  Braces,
  Parentheses,
  Hash,
  Minus,
} from "lucide-react";

/* ─── Types ─── */
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

/* ─── Code Constellation Background ─── */
function CodeConstellation() {
  const symbols = [
    { Icon: Code2, x: "8%", y: "12%", size: 14, opacity: 0.04, delay: 0 },
    { Icon: Braces, x: "85%", y: "18%", size: 12, opacity: 0.03, delay: 2 },
    { Icon: Parentheses, x: "15%", y: "78%", size: 16, opacity: 0.035, delay: 4 },
    { Icon: Minus, x: "72%", y: "82%", size: 10, opacity: 0.04, delay: 1 },
    { Icon: Hash, x: "45%", y: "8%", size: 11, opacity: 0.025, delay: 3 },
    { Icon: Code2, x: "92%", y: "55%", size: 13, opacity: 0.03, delay: 5 },
    { Icon: Braces, x: "5%", y: "45%", size: 15, opacity: 0.035, delay: 2.5 },
    { Icon: Parentheses, x: "60%", y: "88%", size: 12, opacity: 0.03, delay: 1.5 },
    { Icon: Code2, x: "35%", y: "92%", size: 10, opacity: 0.04, delay: 4.5 },
    { Icon: Hash, x: "78%", y: "35%", size: 14, opacity: 0.025, delay: 3.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {symbols.map((sym, i) => (
        <motion.div
          key={i}
          className="absolute text-slate-700"
          style={{ left: sym.x, top: sym.y, opacity: sym.opacity }}
          animate={{ y: [0, -8, 0], opacity: [sym.opacity, sym.opacity * 2, sym.opacity] }}
          transition={{ duration: 8, repeat: Infinity, delay: sym.delay, ease: "easeInOut" }}
        >
          <sym.Icon size={sym.size} strokeWidth={1} />
        </motion.div>
      ))}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
    </div>
  );
}

/* ─── Terminal Hero Component ─── */
function TerminalHero({ onStateChange }: { onStateChange?: (state: { currentLine: number; isPlaying: boolean; lines: TerminalLine[] }) => void }) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [installStep, setInstallStep] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [installCopied, setInstallCopied] = useState(false);
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
    { type: "output", content: "Routing uses the App Router with file-system", delay: 1500 },
    { type: "output", content: "based routing. Dynamic routes use [param] folders.", delay: 1500 },
    { type: "info", content: "", delay: 1000 },
    { type: "info", content: "app/dashboard/page.tsx:11-38", delay: 800 },
    { type: "info", content: "app/api/route.ts:23-67", delay: 800 },
  ];

  const installSteps = [
    "git clone https://github.com/whoknowsasaint/reposcope",
    "cd reposcope",
    "pip install -e .",
  ];

  const runScenario = useCallback(() => {
    setLines([]);
    setCurrentLine(0);
    setIsPlaying(true);
    setInstallStep(0);
    setTypedText("");
    hasLoopedRef.current = false;
  }, []);

  useEffect(() => {
    if (!isPlaying || currentLine >= scenario.length) return;
    const timer = setTimeout(() => {
      setLines((prev) => [...prev, scenario[currentLine]]);
      setCurrentLine((prev) => prev + 1);
    }, scenario[currentLine].delay || 2000);
    return () => clearTimeout(timer);
  }, [currentLine, isPlaying]);

  // Typing animation — types character by character, loops forever
  useEffect(() => {
    const currentCmd = installSteps[installStep];
    if (typedText.length < currentCmd.length) {
      const timer = setTimeout(() => {
        setTypedText(currentCmd.slice(0, typedText.length + 1));
      }, 50);
      return () => clearTimeout(timer);
    } else {
      const pause = setTimeout(() => {
        setInstallStep((prev) => (prev + 1) % installSteps.length);
        setTypedText("");
        setInstallCopied(false);
      }, 4500);
      return () => clearTimeout(pause);
    }
  }, [typedText, installStep]);

  useEffect(() => {
    if (currentLine >= scenario.length && isPlaying && !hasLoopedRef.current) {
      hasLoopedRef.current = true;
      const loopTimer = setTimeout(() => runScenario(), 70000);
      return () => clearTimeout(loopTimer);
    }
  }, [currentLine, isPlaying, runScenario]);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    onStateChange?.({ currentLine, isPlaying, lines });
  }, [currentLine, isPlaying, lines, onStateChange]);

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "input": return "text-[#7ee787]";
      case "success": return "text-[#7ee787]";
      case "error": return "text-[#f85149]";
      case "info": return "text-[#8b949e]";
      default: return "text-[#c9d1d9]";
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-xl overflow-hidden bg-[#0d1117] ring-1 ring-white/[0.08] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsPlaying(!isPlaying)} className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors" title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button onClick={runScenario} className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors" title="Replay">
              <RotateCcw size={14} />
            </button>
          </div>
          <span className="text-[12px] text-[#8b949e] font-mono">PowerShell — reposcope</span>
        </div>
        <div ref={terminalRef} className="p-4 h-[320px] overflow-y-auto font-mono text-[13px] leading-relaxed">
          <div className="text-[#8b949e] mb-2">$ reposcope list</div>
          <div className="text-[#c9d1d9] mb-4">Indexed Repositories:</div>
          <div className="text-[#7ee787] mb-4">  * next-learn (5ebac08309e7)</div>
          {lines.map((line, i) => (
            <div key={i} className={`${getLineColor(line.type)} mb-0.5`}>
              {line.type === "input" && <span className="text-[#8b949e]">$ </span>}
              {line.content}
            </div>
          ))}
          {isPlaying && currentLine < scenario.length && <div className="text-[#7ee787] animate-pulse">|</div>}
        </div>
      </div>

      {/* Animated Install Commands — types character by character, loops forever */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] rounded-lg ring-1 ring-white/[0.08]">
          <span className="text-[#8b949e] text-[13px] font-mono flex-shrink-0">$</span>
          <code className="text-[13px] font-mono text-[#c9d1d9]">
            {typedText}
            <span className="text-[#7ee787] animate-pulse">|</span>
          </code>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(installSteps[installStep]);
            setInstallCopied(true);
            setTimeout(() => setInstallCopied(false), 1500);
          }}
          className="p-2.5 bg-[#161b22] hover:bg-[#1f242c] rounded-lg ring-1 ring-white/[0.08] transition-all duration-300 flex-shrink-0"
          title="Copy to clipboard"
        >
          {installCopied ? <Check size={16} className="text-[#7ee787]" /> : <Copy size={16} className="text-[#8b949e]" />}
        </button>
      </div>
    </div>
  );
}

/* ─── Aperture Pipeline (Desktop + Mobile) ─── */
function AperturePipeline({ state }: { state: PipelineState }) {
  const stations = [
    { id: "clone" as const, label: "Clone", icon: GitBranch, color: "slate", desc: "Download repository" },
    { id: "parse" as const, label: "Parse", icon: Layers, color: "emerald", desc: "Build AST tree" },
    { id: "chunk" as const, label: "Chunk", icon: FileCode, color: "amber", desc: "Split by structure" },
    { id: "embed" as const, label: "Embed", icon: Database, color: "blue", desc: "Generate vectors" },
    { id: "store" as const, label: "Store", icon: Server, color: "violet", desc: "Persist to ChromaDB" },
  ];

  const getStepStatus = (stepId: string) => {
    if (state.phase === "idle") return "idle";
    if (state.phase === "complete") return "done";
    if (state.phase !== "running") return "idle";
    const stepOrder = ["clone", "parse", "chunk", "embed", "store"];
    const currentIdx = stepOrder.indexOf(state.step || "");
    const thisIdx = stepOrder.indexOf(stepId);
    if (thisIdx < currentIdx) return "done";
    if (thisIdx === currentIdx) return "active";
    return "future";
  };

  const getProgressPercent = () => {
    if (state.phase === "idle") return 0;
    if (state.phase === "complete") return 100;
    if (state.phase !== "running" || !state.step) return 0;
    const stepOrder = ["clone", "parse", "chunk", "embed", "store"];
    const idx = stepOrder.indexOf(state.step);
    return ((idx + 0.5) / stepOrder.length) * 100;
  };

  const isComplete = state.phase === "complete";
  const isRunning = state.phase === "running";
  const runningState = isRunning ? state : null;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* DESKTOP */}
      <div className="hidden lg:block">
        <div className="relative rounded-[20px] overflow-hidden bg-[#050508] ring-1 ring-white/[0.06] shadow-2xl shadow-black/60">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
          <CodeConstellation />
          <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              {isComplete ? <motion.div className="w-2.5 h-2.5 rounded-full bg-emerald-400" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} /> : isRunning ? <motion.div className="w-2.5 h-2.5 rounded-full bg-amber-400" animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }} transition={{ duration: 3, repeat: Infinity }} /> : <div className="w-2.5 h-2.5 rounded-full bg-[#484f58]" />}
              <span className="text-[12px] text-[#8b949e] font-mono uppercase tracking-wider">{state.phase === "idle" && "Pipeline"}{isRunning && "Indexing..."}{isComplete && "Indexed"}</span>
            </div>
            <div className="text-[12px] font-mono text-[#484f58]">{state.phase === "idle" && "5 steps"}{isRunning && <><span className="text-amber-400">{state.stats.filesDone}</span><span className="text-[#484f58]">/{state.stats.filesTotal} files</span></>}{isComplete && <span className="text-emerald-400">246 files • 564 chunks</span>}</div>
          </div>
          <div className="relative z-10 px-8 py-12">
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-1 bg-white/[0.03] rounded-full" />
            <motion.div className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-amber-500/40 to-amber-500/10 rounded-full" initial={{ width: "0%" }} animate={{ width: `${getProgressPercent()}%` }} transition={{ duration: 2.5, ease: "easeInOut" }} />
            {stations.map((_, i) => <div key={i} className="absolute top-1/2 -translate-y-1/2 w-[1px] h-3 bg-white/[0.08]" style={{ left: `${14 + i * 18}%` }} />)}
            <div className="relative flex items-center justify-between">
              {stations.map((station, i) => {
                const status = getStepStatus(station.id);
                const Icon = station.icon;
                return (
                  <div key={station.id} className="relative flex flex-col items-center gap-3">
                    <motion.div className={`relative w-14 h-14 rounded-full flex items-center justify-center ${status === "done" ? "bg-emerald-500/15 ring-2 ring-emerald-500/30" : ""} ${status === "active" ? "bg-amber-500/15 ring-2 ring-amber-500/40" : ""} ${status === "future" || status === "idle" ? "bg-white/[0.03] ring-1 ring-white/[0.08]" : ""}`} animate={status === "active" ? { boxShadow: ["0 0 20px rgba(245,158,11,0.1)", "0 0 40px rgba(245,158,11,0.2)", "0 0 20px rgba(245,158,11,0.1)"] } : {}} transition={{ duration: 3, repeat: Infinity }}>
                      <div className={`${status === "done" ? "text-emerald-400" : ""} ${status === "active" ? "text-amber-400" : ""} ${status === "future" || status === "idle" ? "text-[#484f58]" : ""}`}>{status === "done" ? <Check size={20} /> : <Icon size={20} />}</div>
                      {status === "active" && <motion.div className="absolute inset-0 rounded-full bg-amber-500/10" animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />}
                    </motion.div>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-[13px] font-medium ${status === "done" || status === "active" ? "text-white" : "text-[#484f58]"}`}>{station.label}</span>
                      <span className="text-[10px] text-[#484f58]">{station.desc}</span>
                    </div>
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono ${status === "done" ? "bg-emerald-500/20 text-emerald-400" : ""} ${status === "active" ? "bg-amber-500/20 text-amber-400" : ""} ${status === "future" || status === "idle" ? "bg-white/[0.05] text-[#484f58]" : ""}`}>{status === "done" ? "✓" : i + 1}</div>
                  </div>
                );
              })}
            </div>
            <AnimatePresence mode="wait">
              {isRunning && runningState?.step && runningState?.file && (
                <motion.div className="absolute top-1/2 -translate-y-1/2 z-30" initial={{ left: "10%", opacity: 0, scale: 0.5 }} animate={{ left: `${14 + ["clone","parse","chunk","embed","store"].indexOf(runningState.step) * 18}%`, opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ type: "spring", stiffness: 25, damping: 20, mass: 2.5, duration: 3 }}>
                  <MorphingFile step={runningState.step} file={runningState.file} />
                </motion.div>
              )}
            </AnimatePresence>
            {isRunning && runningState?.step && <motion.div className="absolute top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-emerald-500/20 to-transparent rounded-full" style={{ left: "14%" }} animate={{ width: `${["clone","parse","chunk","embed","store"].indexOf(runningState.step) * 18}%` }} transition={{ duration: 2 }} />}
            <AnimatePresence>{isComplete && <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" initial={{ scale: 0, opacity: 1 }} animate={{ scale: 4, opacity: 0 }} transition={{ duration: 3, ease: "easeOut" }}><div className="w-24 h-24 rounded-full border border-emerald-500/20" /></motion.div>}</AnimatePresence>
          </div>
          <div className="relative z-10 mx-6 mb-6">
            <div className="rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] px-6 py-4">
              {state.phase === "idle" && <div className="flex items-center justify-center gap-2 text-[13px] text-[#484f58]"><motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 6, repeat: Infinity }}>Ready. Click play in the terminal to start indexing.</motion.span></div>}
              {isRunning && runningState?.file && (
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3"><div className="w-8 h-10 bg-[#161b22] rounded border border-white/[0.06] flex flex-col items-center justify-center"><span className="text-[8px] text-[#8b949e]">{runningState.file.language.slice(0,3)}</span></div><div className="flex flex-col"><span className="text-[13px] text-white font-medium">{runningState.file.name}</span><span className="text-[11px] text-[#484f58]">{runningState.file.lines} lines</span></div></div>
                  <div className="text-[#484f58]">→</div>
                  <div className="flex flex-col"><span className="text-[13px] text-amber-400">{runningState.step === "clone" && "Downloading..."}{runningState.step === "parse" && "Building AST..."}{runningState.step === "chunk" && `${runningState.file.chunks.length} chunks`}{runningState.step === "embed" && `${runningState.file.chunks.length} vectors`}{runningState.step === "store" && "Persisting..."}</span><span className="text-[11px] text-[#484f58]">{runningState.step === "clone" && "Resolving deltas"}{runningState.step === "parse" && "tree-sitter extraction"}{runningState.step === "chunk" && "AST boundaries preserved"}{runningState.step === "embed" && "jina-embeddings-v3"}{runningState.step === "store" && "ChromaDB HNSW index"}</span></div>
                  <div className="ml-auto flex items-center gap-2"><div className="w-24 h-1 bg-white/[0.06] rounded-full overflow-hidden"><motion.div className="h-full bg-amber-500/60 rounded-full" animate={{ width: ["0%", "100%"] }} transition={{ duration: 4, ease: "easeInOut" }} /></div><span className="text-[10px] text-[#484f58] font-mono">{Math.round(getProgressPercent())}%</span></div>
                </div>
              )}
              {isComplete && <div className="flex items-center justify-center gap-2 text-[13px] text-emerald-400"><Check size={16} /><span>All 564 chunks indexed and ready for semantic search</span></div>}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="lg:hidden">
        <div className="relative rounded-2xl overflow-hidden bg-[#050508] ring-1 ring-white/[0.06]">
          <CodeConstellation />
          <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">{isComplete ? <div className="w-2 h-2 rounded-full bg-emerald-400" /> : isRunning ? <motion.div className="w-2 h-2 rounded-full bg-amber-400" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} /> : <div className="w-2 h-2 rounded-full bg-[#484f58]" />}<span className="text-[11px] text-[#8b949e] font-mono uppercase">{state.phase === "idle" && "Pipeline"}{isRunning && "Indexing..."}{isComplete && "Indexed"}</span></div>
            <span className="text-[11px] font-mono text-[#484f58]">{isRunning && <><span className="text-amber-400">{state.stats.filesDone}</span><span className="text-[#484f58]">/{state.stats.filesTotal}</span></>}{isComplete && <span className="text-emerald-400">246 • 564</span>}</span>
          </div>
          <div className="relative z-10 p-4 space-y-2">
            {stations.map((station, i) => {
              const status = getStepStatus(station.id);
              const Icon = station.icon;
              const isExpanded = status === "active";
              return (
                <motion.div key={station.id} className={`rounded-xl border overflow-hidden ${status === "done" ? "bg-emerald-500/[0.04] border-emerald-500/15" : ""} ${status === "active" ? "bg-amber-500/[0.04] border-amber-500/25" : ""} ${status === "future" || status === "idle" ? "bg-white/[0.02] border-white/[0.05]" : ""}`} animate={isExpanded ? { scale: 1.02 } : { scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${status === "done" ? "bg-emerald-500/15 text-emerald-400" : ""} ${status === "active" ? "bg-amber-500/15 text-amber-400" : ""} ${status === "future" || status === "idle" ? "bg-white/[0.05] text-[#484f58]" : ""}`}>{status === "done" ? <Check size={16} /> : <Icon size={16} />}</div>
                    <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className={`text-[13px] font-medium ${status === "done" || status === "active" ? "text-white" : "text-[#484f58]"}`}>{station.label}</span><span className="text-[10px] text-[#484f58]">{station.desc}</span></div><div className="text-[11px] mt-0.5">{status === "done" && <span className="text-emerald-400/70">Complete</span>}{status === "active" && <span className="text-amber-400/70">Working...</span>}{status === "future" && <span className="text-[#484f58]">Waiting</span>}{status === "idle" && <span className="text-[#484f58]">Ready</span>}</div></div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono flex-shrink-0 ${status === "done" ? "bg-emerald-500/10 text-emerald-400" : ""} ${status === "active" ? "bg-amber-500/10 text-amber-400" : ""} ${status === "future" || status === "idle" ? "bg-white/[0.05] text-[#484f58]" : ""}`}>{status === "done" ? "✓" : i + 1}</div>
                  </div>
                  <AnimatePresence>{isExpanded && runningState?.file && runningState?.step && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}><div className="px-4 pb-4 pt-1 border-t border-white/[0.04]"><div className="flex items-center gap-3 py-2"><MorphingFile step={runningState.step} file={runningState.file} compact /></div><div className="text-[11px] text-[#8b949e] font-mono">{runningState.step === "clone" && `Downloading ${runningState.file.name}...`}{runningState.step === "parse" && `Building AST: ${runningState.file.lines} lines → nodes`}{runningState.step === "chunk" && `Split into ${runningState.file.chunks.length} semantic units`}{runningState.step === "embed" && `Vectorizing ${runningState.file.chunks.length} chunks with Jina AI...`}{runningState.step === "store" && `Writing to ChromaDB...`}</div></div></motion.div>}</AnimatePresence>
                </motion.div>
              );
            })}
          </div>
          <div className="relative z-10 px-4 py-3 border-t border-white/[0.05]"><div className="text-[11px] font-mono text-[#484f58]">{state.phase === "idle" && "Tap play in terminal above"}{isRunning && runningState?.step && <span className="text-amber-400">{runningState.step} → <span className="text-[#8b949e]">{runningState.file.name}</span></span>}{isComplete && <span className="text-emerald-400">Ready for queries</span>}</div></div>
        </div>
      </div>
    </div>
  );
}

/* ─── Morphing File ─── */
function MorphingFile({ step, file, compact }: { step: PipelineStep; file: FileInFlight; compact?: boolean }) {
  if (!step) return null;
  if (compact) {
    const v: any = {
      clone: <div className="w-6 h-8 bg-[#161b22] rounded border border-slate-500/20 flex items-center justify-center"><span className="text-[7px] text-slate-400">{file.language.slice(0,2)}</span></div>,
      parse: <svg width="24" height="24" viewBox="0 0 40 40" className="text-emerald-400"><path d="M20 32 L20 18 L10 8 M20 18 L30 8" stroke="currentColor" strokeWidth="2" fill="none" /></svg>,
      chunk: <div className="flex gap-0.5">{file.chunks.slice(0,2).map((_,i) => <div key={i} className="w-4 h-5 bg-[#161b22] rounded border border-amber-500/20" />)}</div>,
      embed: <div className="flex gap-1">{Array.from({length: 2}).map((_,i) => <div key={i} className="w-2 h-2 rounded-full bg-blue-500" />)}</div>,
      store: <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"><Check size={12} className="text-emerald-400" /></div>,
    };
    return v[step];
  }
  const v: any = {
    clone: <div className="flex flex-col items-center"><motion.div className="w-12 h-14 bg-[#161b22] rounded-lg border border-slate-500/20 flex flex-col items-center justify-center shadow-xl" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}><span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{file.language.slice(0,3)}</span><span className="text-[8px] text-[#484f58] mt-0.5">{file.name.slice(0,10)}</span></motion.div></div>,
    parse: <div className="flex flex-col items-center"><svg width="48" height="48" viewBox="0 0 48 48" className="text-emerald-400"><motion.path d="M24 38 L24 22 L12 10 M24 22 L36 10" stroke="currentColor" strokeWidth="2.5" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }} /><motion.circle cx="24" cy="38" r="3" fill="currentColor" /><motion.circle cx="12" cy="10" r="2.5" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5, type: "spring" }} /><motion.circle cx="36" cy="10" r="2.5" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.8, type: "spring" }} /></svg><motion.span className="text-[9px] font-mono text-emerald-400 mt-1 tracking-wider" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>{file.lines} LINES</motion.span></div>,
    chunk: <div className="flex gap-1.5">{file.chunks.map((chunk, i) => <motion.div key={i} className="w-9 h-11 bg-[#161b22] rounded-lg border border-amber-500/25 flex items-center justify-center shadow-lg" initial={{ scale: 0, y: 20, rotate: -10 }} animate={{ scale: 1, y: 0, rotate: 0 }} transition={{ delay: i * 0.5, type: "spring", stiffness: 40, damping: 10 }}><span className="text-[10px] text-amber-400 font-mono uppercase">{chunk.type[0]}</span></motion.div>)}</div>,
    embed: <div className="flex gap-3">{Array.from({ length: Math.min(file.chunks.length, 3) }).map((_, i) => <motion.div key={i} className="w-4 h-4 rounded-full bg-blue-500 shadow-lg" animate={{ scale: [1, 1.6, 1], opacity: [0.3, 1, 0.3], boxShadow: ["0 0 8px rgba(59,130,246,0.2)", "0 0 20px rgba(59,130,246,0.6)", "0 0 8px rgba(59,130,246,0.2)"] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }} />)}</div>,
    store: <motion.div className="w-12 h-12 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center shadow-xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 120, damping: 12 }}><motion.div className="absolute inset-0 rounded-full bg-emerald-500/10" animate={{ scale: [1, 2.5], opacity: [0.6, 0] }} transition={{ duration: 1.5, repeat: 2 }} /><Check size={20} className="text-emerald-400" /></motion.div>,
  };
  return <div className="relative">{v[step]}<motion.div className="absolute inset-0 -z-10 blur-2xl" animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 3, repeat: Infinity }} style={{ background: step === "clone" ? "rgba(100,116,139,0.3)" : step === "parse" ? "rgba(52,211,153,0.3)" : step === "chunk" ? "rgba(245,158,11,0.3)" : step === "embed" ? "rgba(59,130,246,0.3)" : "rgba(52,211,153,0.3)" }} /></div>;
}

/* ─── Code Comparison Demo ─── */
function CodeComparison() {
  const [view, setView] = useState<"raw" | "chunked">("raw");
  const rawCode = `def _chunk_with_ast(content, file_path, language):
    """Chunk code using tree-sitter AST."""
    lang_module = _get_language_module(language)
    if not lang_module:
        return _simple_chunk(content, file_path)

    parser = Parser(lang_module)
    source_bytes = bytes(content, "utf8")
    tree = parser.parse(source_bytes)

    query_str = QUERIES.get(language, "")
    if not query_str:
        return _simple_chunk(content, file_path)

    query = Query(lang_module, query_str)
    cursor = QueryCursor(query)
    matches = cursor.matches(tree.root_node)

    chunks = []
    for pattern_idx, captures_dict in matches:
        for capture_name in ("function", "class", "method"):
            if capture_name not in captures_dict:
                continue
            for node in captures_dict[capture_name]:
                start_line = node.start_point[0] + 1
                end_line = node.end_point[0] + 1
                chunk_lines = content.split("\\n")[start_line-1:end_line]
                chunks.append(CodeChunk(
                    content="\\n".join(chunk_lines),
                    file_path=file_path,
                    start_line=start_line,
                    end_line=end_line,
                    chunk_type=capture_name,
                    language=language,
                ))
    return chunks or _simple_chunk(content, file_path)`;
  const chunkedView = `=== Chunk 1/8 ===
Type: function_definition
Lines: 1-34
Name: _chunk_with_ast
---
def _chunk_with_ast(content, file_path, language):
    """Chunk code using tree-sitter AST."""

=== Chunk 2/8 ===
Type: parser setup
Lines: 8-10
---
    parser = Parser(lang_module)
    source_bytes = bytes(content, "utf8")
    tree = parser.parse(source_bytes)

=== Chunk 3/8 ===
Type: query execution
Lines: 14-16
---
    query = Query(lang_module, query_str)
    cursor = QueryCursor(query)
    matches = cursor.matches(tree.root_node)

=== Chunks 4-8 ===
Type: method / class extraction
Lines: 18-34
---
    for pattern_idx, captures_dict in matches:
        ...extracts node positions...
        ...creates CodeChunk objects...`;
  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-xl overflow-hidden bg-[#0d1117] ring-1 ring-white/[0.08]">
        <div className="flex items-center gap-1 px-2 py-2 bg-[#161b22] border-b border-white/[0.06]">
          <button onClick={() => setView("raw")} className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${view === "raw" ? "bg-white/[0.08] text-white" : "text-[#8b949e] hover:text-white"}`}>Raw File</button>
          <button onClick={() => setView("chunked")} className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${view === "chunked" ? "bg-white/[0.08] text-white" : "text-[#8b949e] hover:text-white"}`}>AST Chunks</button>
          <span className="ml-auto text-[12px] text-[#636366] font-mono">reposcope/core/chunker.py</span>
        </div>
        <div className="p-4 font-mono text-[12px] sm:text-[13px] leading-relaxed overflow-x-auto"><pre className="text-[#c9d1d9] whitespace-pre-wrap">{view === "raw" ? rawCode : chunkedView}</pre></div>
        <div className="px-4 py-3 bg-[#161b22] border-t border-white/[0.06] flex items-center gap-6 text-[12px] text-[#8b949e]"><span>{view === "raw" ? "34 lines" : "8 semantic chunks"}</span><span>{view === "raw" ? "1 function" : "Avg 205 tokens/chunk"}</span><span className="text-[#7ee787]">{view === "chunked" ? "Preserves function boundaries" : "Used in production — indexing real repos"}</span></div>
      </div>
    </div>
  );
}

/* ─── Fade In Wrapper ─── */
function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

/* ─── Main Page ─── */
export default function Home() {
  const [pipelineState, setPipelineState] = useState<PipelineState>({ phase: "idle" });
  const handleTerminalStateChange = useCallback((terminalState: { currentLine: number; isPlaying: boolean; lines: TerminalLine[] }) => {
    const currentScenarioLine = terminalState.lines[terminalState.lines.length - 1];
    if (!terminalState.isPlaying) { setPipelineState({ phase: "idle" }); return; }
    if (currentScenarioLine?.pipelineStep) {
      setPipelineState({ phase: "running", step: currentScenarioLine.pipelineStep, file: currentScenarioLine.fileInfo || { name: "unknown", language: "TypeScript", lines: 0, chunks: [] }, stats: currentScenarioLine.stats || { filesDone: 0, filesTotal: 246, chunksDone: 0, elapsedMs: 0 } });
    } else if (terminalState.currentLine >= 11) {
      setPipelineState({ phase: "complete", totalFiles: 246, totalChunks: 564 });
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#000000] text-white selection:bg-white/20">
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#000000]/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center ring-1 ring-white/[0.08]"><Terminal size={16} className="text-white" /></div>
            <Link href="/" className="text-[15px] font-semibold tracking-tight hover:text-[#e5e5e7] transition-colors">Reposcope</Link>
          </div>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="hidden sm:block text-[14px] text-[#86868b] hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hidden sm:block text-[14px] text-[#86868b] hover:text-white transition-colors">Features</a>
            <a href="https://github.com/whoknowsasaint/reposcope" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[14px] text-[#86868b] hover:text-white transition-colors"><Github size={16} /><span className="hidden sm:inline">GitHub</span></a>
            <Link href="/chat" className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg text-[13px] font-medium transition-colors ring-1 ring-white/[0.08]">Launch App</Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] mb-6"><span className="w-2 h-2 rounded-full bg-[#7ee787] animate-pulse" /><span className="text-[13px] text-[#86868b]">Open source — MIT License</span></div>
              <h1 className="text-[40px] sm:text-[52px] font-bold tracking-tight leading-[1.1] mb-6">Chat with any<br /><span className="text-[#86868b]">codebase.</span></h1>
              <p className="text-[17px] text-[#86868b] leading-relaxed mb-8 max-w-lg">Onboard to new repos in minutes instead of weeks. Ask questions in plain English and get real answers with file references.</p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/chat" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg text-[15px] font-semibold hover:bg-[#f5f5f7] transition-colors active:scale-95">Try the Web UI<ArrowRight size={16} /></Link>
                <a href="https://github.com/whoknowsasaint/reposcope" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-lg text-[15px] font-medium transition-colors ring-1 ring-white/[0.08]"><Github size={16} />Star on GitHub</a>
              </div>
              <div className="mt-8 flex items-center gap-6 text-[13px] text-[#636366]"><div className="flex items-center gap-2"><Zap size={14} /><span>Groq-powered</span></div><div className="flex items-center gap-2"><Layers size={14} /><span>AST chunking</span></div><div className="flex items-center gap-2"><Terminal size={14} /><span>CLI + Web UI</span></div></div>
            </FadeIn>
            <FadeIn delay={200}><TerminalHero onStateChange={handleTerminalStateChange} /></FadeIn>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16"><h2 className="text-[32px] sm:text-[40px] font-bold tracking-tight mb-4">Pipeline you can inspect.</h2><p className="text-[17px] text-[#86868b] max-w-xl mx-auto">Every step is transparent. Watch your code travel from raw files to searchable vectors.</p></FadeIn>
          <FadeIn delay={100}><AperturePipeline state={pipelineState} /></FadeIn>
        </div>
      </section>

      <section id="features" className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[13px] font-medium mb-6 ring-1 ring-emerald-500/20"><Layers size={14} />AST-Aware Chunking</div>
                <h2 className="text-[32px] sm:text-[40px] font-bold tracking-tight mb-4">Split by structure,<br /><span className="text-[#86868b]">not by line count.</span></h2>
                <p className="text-[17px] text-[#86868b] leading-relaxed mb-6">Traditional RAG splits files every N lines, breaking functions mid-body. We use tree-sitter to chunk at function/class/method boundaries, preserving semantic meaning and producing cleaner retrieval results.</p>
                <ul className="space-y-3 text-[14px] text-[#86868b]">
                  <li className="flex items-start gap-3"><Check size={16} className="text-[#7ee787] mt-0.5 shrink-0" /><span>Supports Python, TypeScript, JavaScript, Go, Rust, and more</span></li>
                  <li className="flex items-start gap-3"><Check size={16} className="text-[#7ee787] mt-0.5 shrink-0" /><span>564 chunks from 246 files on vercel/next-learn</span></li>
                  <li className="flex items-start gap-3"><Check size={16} className="text-[#7ee787] mt-0.5 shrink-0" /><span>Each chunk is a complete function, class, or method</span></li>
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={200}><CodeComparison /></FadeIn>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16"><h2 className="text-[32px] sm:text-[40px] font-bold tracking-tight mb-4">Built for how you actually work.</h2></FadeIn>
          <div className="grid sm:grid-cols-3 gap-6">
            {[{ title: "Onboarding", desc: "New team member? Index the repo and ask 'how does auth work?' Get the exact files, functions, and call chains in seconds.", metric: "Onboard in hours, not weeks" },{ title: "Code Review", desc: "Reviewing a PR that touches 40 files? Ask 'what does this change affect?' and get every reference mapped.", metric: "Understand impact instantly" },{ title: "Legacy Maintenance", desc: "Inherited a codebase with no docs? Ask why things work the way they do. Get answers with precise line references.", metric: "Decode legacy code fast" }].map((useCase, i) => (
              <FadeIn key={i} delay={i * 100}><div className="h-full p-6 rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] hover:bg-white/[0.04] transition-colors"><h3 className="text-[18px] font-semibold mb-3">{useCase.title}</h3><p className="text-[14px] text-[#86868b] leading-relaxed mb-4">{useCase.desc}</p><div className="text-[13px] text-[#7ee787] font-medium">{useCase.metric}</div></div></FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <div className="rounded-xl overflow-hidden bg-[#0d1117] ring-1 ring-white/[0.08] p-6">
                <div className="font-mono text-[13px] leading-relaxed">
                  <div className="text-[#8b949e] mb-4"># Tech Stack</div>
                  <div className="text-[#ff7b72]">backend:</div><div className="text-[#79c0ff] ml-4">framework:</div><div className="text-[#a5d6ff] ml-8">FastAPI + Uvicorn</div>
                  <div className="text-[#79c0ff] ml-4">vector_db:</div><div className="text-[#a5d6ff] ml-8">ChromaDB (persistent)</div>
                  <div className="text-[#79c0ff] ml-4">embeddings:</div><div className="text-[#a5d6ff] ml-8">Jina AI (jina-embeddings-v3)</div>
                  <div className="text-[#79c0ff] ml-4">llm:</div><div className="text-[#a5d6ff] ml-8">Groq (Llama 3.3 70B)</div>
                  <div className="text-[#ff7b72] mt-3">frontend:</div><div className="text-[#79c0ff] ml-4">framework:</div><div className="text-[#a5d6ff] ml-8">Next.js 14 + React 18</div>
                  <div className="text-[#79c0ff] ml-4">styling:</div><div className="text-[#a5d6ff] ml-8">Tailwind CSS</div>
                  <div className="text-[#ff7b72] mt-3">parsing:</div><div className="text-[#79c0ff] ml-4">ast:</div><div className="text-[#a5d6ff] ml-8">tree-sitter (15+ languages)</div>
                  <div className="text-[#8b949e] mt-4"># All local-first, no data leaves your machine</div>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={200}>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-[13px] font-medium mb-6 ring-1 ring-blue-500/20"><Lock size={14} />Self-Hosted</div>
                <h2 className="text-[32px] sm:text-[40px] font-bold tracking-tight mb-4">Runs on your<br /><span className="text-[#86868b]">machine.</span></h2>
                <p className="text-[17px] text-[#86868b] leading-relaxed mb-6">No SaaS lock-in, no API quotas for indexing. ChromaDB stores vectors locally. SQLite keeps your conversation history. Your code never leaves your computer.</p>
                <ul className="space-y-3 text-[14px] text-[#86868b]">
                  <li className="flex items-start gap-3"><Check size={16} className="text-[#7ee787] mt-0.5 shrink-0" /><span>SQLite for conversation history and metadata</span></li>
                  <li className="flex items-start gap-3"><Check size={16} className="text-[#7ee787] mt-0.5 shrink-0" /><span>ChromaDB persistent client for vector storage</span></li>
                  <li className="flex items-start gap-3"><Check size={16} className="text-[#7ee787] mt-0.5 shrink-0" /><span>Streaming responses via Server-Sent Events</span></li>
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <FadeIn className="max-w-2xl mx-auto text-center">
          <h2 className="text-[32px] sm:text-[40px] font-bold tracking-tight mb-4">Stop grepping. Start asking.</h2>
          <p className="text-[17px] text-[#86868b] mb-8">Clone the repo, install dependencies, and start chatting with your codebase in under 5 minutes.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/chat" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg text-[15px] font-semibold hover:bg-[#f5f5f7] transition-colors">Launch Web UI<ArrowRight size={16} /></Link>
            <a href="https://github.com/whoknowsasaint/reposcope" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-lg text-[15px] font-medium transition-colors ring-1 ring-white/[0.08]"><Github size={16} />View Source</a>
          </div>
        </FadeIn>
      </section>

      <footer className="py-12 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center ring-1 ring-white/[0.08]"><Terminal size={16} className="text-white" /></div><div><div className="text-[15px] font-semibold">Reposcope</div><div className="text-[12px] text-[#636366]">Chat with any codebase</div></div></div>
            <div className="flex items-center gap-8 text-[13px] text-[#636366]"><a href="https://github.com/whoknowsasaint/reposcope" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a><Link href="/chat" className="hover:text-white transition-colors">Web UI</Link></div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#636366]"><p>MIT License. Built with FastAPI, Next.js, ChromaDB, and tree-sitter.</p><p>Powered by Groq and Jina AI.</p></div>
        </div>
      </footer>
    </main>
  );
}