"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Square, AlertTriangle } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  error?: string | null;
}

const SLASH_COMMANDS = [
  { command: "/clear", description: "Clear this conversation" },
];

export function ChatInput({
  onSend,
  onStop,
  disabled,
  isStreaming,
  placeholder,
  error,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
  }, [message]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowCommands(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = message.trim();
      if (!trimmed || disabled) return;
      if (trimmed.startsWith("/")) {
        const [cmd] = trimmed.slice(1).split(" ");
        if (cmd === "clear") {
          onSend(trimmed);
        }
      } else {
        onSend(trimmed);
      }
      setMessage("");
      setShowCommands(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
    [message, disabled, onSend]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showCommands) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedCommand((prev) => (prev + 1) % SLASH_COMMANDS.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedCommand((prev) => (prev - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const cmd = SLASH_COMMANDS[selectedCommand];
          setMessage(cmd.command + " ");
          setShowCommands(false);
          textareaRef.current?.focus();
          return;
        }
        if (e.key === "Escape") {
          setShowCommands(false);
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [showCommands, selectedCommand, handleSubmit]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setMessage(value);
      if (value === "/") {
        setShowCommands(true);
        setSelectedCommand(0);
      } else if (!value.startsWith("/")) {
        setShowCommands(false);
      }
    },
    []
  );

  return (
    <div ref={containerRef} className="relative">
      {error && (
        <div className="max-w-[720px] mx-auto mb-2 px-3 py-2 rounded-xl bg-red-500/10 backdrop-blur-xl text-red-400 text-[12px] flex items-center gap-2 ring-1 ring-red-500/20">
          <AlertTriangle size={12} />
          {error}
        </div>
      )}

      {/* Command Palette - glass */}
      {showCommands && (
        <div className="absolute bottom-full left-0 right-0 mb-2 max-w-[720px] mx-auto overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0c]/90 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
          <div className="border-b border-white/[0.08] px-4 py-2.5">
            <span className="text-[10px] uppercase tracking-wide text-white/40 font-medium">
              Commands
            </span>
          </div>
          {SLASH_COMMANDS.map((cmd, i) => (
            <button
              key={cmd.command}
              onClick={() => {
                setMessage(cmd.command + " ");
                setShowCommands(false);
                textareaRef.current?.focus();
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                selectedCommand === i
                  ? "bg-white/[0.08]"
                  : "hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-[12px] font-mono text-blue-400">
                {cmd.command}
              </span>
              <span className="text-[11px] text-white/40">
                {cmd.description}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="pb-4">
        <div className="max-w-[720px] mx-auto px-4">
          <div
            className={`relative flex items-end gap-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0c]/80 backdrop-blur-2xl px-4 py-3 transition-all duration-300 ${
              message.length > 0 || isStreaming
                ? "shadow-[0_8px_30px_rgba(0,0,0,0.3)] ring-1 ring-white/[0.1]"
                : "shadow-[0_4px_18px_rgba(0,0,0,0.2)]"
            } focus-within:border-white/[0.15] focus-within:shadow-[0_12px_40px_rgba(0,0,0,0.35)]`}
          >
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || "Ask about the code..."}
              disabled={disabled}
              rows={1}
              className="relative z-10 flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-relaxed text-white/80 outline-none placeholder:text-white/30 disabled:opacity-30 max-h-[160px]"
            />

            <div className="relative z-10 flex flex-shrink-0 items-center gap-1.5 self-end pb-0.5">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-white/60 transition-colors hover:bg-white/[0.15] hover:text-white/90"
                  title="Stop generation"
                >
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={disabled || !message.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-all hover:bg-white/90 active:scale-90 disabled:bg-white/15 disabled:text-white/40"
                >
                  <ArrowUp size={16} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          {/* Hint */}
          <div className="mt-2.5 flex items-center justify-center text-[10px] text-white/20">
            <span>
              {message.startsWith("/")
                ? "Enter to run command"
                : "Enter to send · Shift+Enter for new line"}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}