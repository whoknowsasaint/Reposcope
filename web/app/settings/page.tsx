"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Key,
  Cpu,
  Database,
  Globe,
  Moon,
  Sun,
  Monitor,
  Save,
  Check,
  AlertCircle,
  Trash2,
} from "lucide-react";

type Theme = "dark" | "light" | "system";

interface Settings {
  apiKeys: {
    groq: string;
    openai: string;
    anthropic: string;
  };
  model: {
    provider: "groq" | "openai" | "anthropic" | "ollama";
    model: string;
    temperature: number;
    maxTokens: number;
  };
  embedding: {
    provider: "openai" | "ollama" | "jina";
    model: string;
  };
  theme: Theme;
  localStoragePath: string;
}

const DEFAULT_SETTINGS: Settings = {
  apiKeys: {
    groq: "",
    openai: "",
    anthropic: "",
  },
  model: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    maxTokens: 8192,
  },
  embedding: {
    provider: "openai",
    model: "jina-embeddings-v3",
  },
  theme: "dark",
  localStoragePath: "~/.reposcope",
};

const MODEL_OPTIONS: Record<string, string[]> = {
  groq: ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
  openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  ollama: ["llama3", "mixtral", "codellama"],
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("general");

 
  useEffect(() => {
    const stored = localStorage.getItem("reposcope-settings");
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("reposcope-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (!confirm("Reset all settings to defaults?")) return;
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem("reposcope-settings");
  };

  const updateApiKey = (provider: keyof Settings["apiKeys"], value: string) => {
    setSettings((prev) => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [provider]: value },
    }));
  };

  const updateModel = (key: keyof Settings["model"], value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      model: { ...prev.model, [key]: value },
    }));
  };

  const maskKey = (key: string) => {
    if (!key) return "";
    if (key.length < 8) return "•".repeat(key.length);
    return key.slice(0, 4) + "•".repeat(key.length - 8) + key.slice(-4);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/chat"
            className="p-2 hover:bg-white/[0.06] rounded-lg text-[#636366] hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-[16px] font-semibold">Settings</h1>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Reset
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                saved
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-white text-black hover:bg-[#e5e5e7]"
              }`}
            >
              {saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar nav */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {[
            { id: "general", label: "General", icon: Monitor },
            { id: "api", label: "API Keys", icon: Key },
            { id: "model", label: "Model", icon: Cpu },
            { id: "embedding", label: "Embedding", icon: Database },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                activeSection === section.id
                  ? "bg-white/[0.06] text-white font-medium"
                  : "text-[#636366] hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              <section.icon size={15} />
              {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {/* General */}
          {activeSection === "general" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[18px] font-semibold mb-1">General</h2>
                <p className="text-[13px] text-[#636366]">Basic preferences and storage</p>
              </div>

              <div className="space-y-4">
                {/* Theme */}
                <div className="p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06]">
                  <label className="text-[13px] font-medium mb-3 block">Theme</label>
                  <div className="flex gap-2">
                    {([
                      { value: "dark", icon: Moon, label: "Dark" },
                      { value: "light", icon: Sun, label: "Light" },
                      { value: "system", icon: Monitor, label: "System" },
                    ] as const).map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setSettings((prev) => ({ ...prev, theme: t.value }))}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] transition-all ${
                          settings.theme === t.value
                            ? "bg-white/[0.08] text-white ring-1 ring-white/[0.12]"
                            : "bg-white/[0.02] text-[#636366] hover:bg-white/[0.04]"
                        }`}
                      >
                        <t.icon size={14} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Storage path */}
                <div className="p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06]">
                  <label className="text-[13px] font-medium mb-2 block">Local Storage Path</label>
                  <input
                    type="text"
                    value={settings.localStoragePath}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, localStoragePath: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-white/[0.03] rounded-lg text-[13px] text-[#e5e5e7] outline-none focus:ring-1 focus:ring-white/[0.1] font-mono"
                  />
                  <p className="mt-2 text-[11px] text-[#636366]">
                    Where repositories and vector databases are stored locally
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* API Keys */}
          {activeSection === "api" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[18px] font-semibold mb-1">API Keys</h2>
                <p className="text-[13px] text-[#636366]">
                  Configure providers. Leave blank to use local Ollama only.
                </p>
              </div>

              <div className="space-y-3">
                {([
                  { key: "groq" as const, label: "Groq", hint: "gsk_..." },
                  { key: "openai" as const, label: "OpenAI", hint: "sk-..." },
                  { key: "anthropic" as const, label: "Anthropic", hint: "sk-ant-..." },
                ]).map((provider) => (
                  <div
                    key={provider.key}
                    className="p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[13px] font-medium">{provider.label}</label>
                      {settings.apiKeys[provider.key] && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <Check size={10} />
                          Set
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={settings.apiKeys[provider.key]}
                      onChange={(e) => updateApiKey(provider.key, e.target.value)}
                      placeholder={provider.hint}
                      className="w-full px-3 py-2 bg-white/[0.03] rounded-lg text-[13px] text-[#e5e5e7] placeholder:text-[#484f58] outline-none focus:ring-1 focus:ring-white/[0.1] font-mono"
                    />
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-blue-500/5 ring-1 ring-blue-500/10">
                <p className="text-[12px] text-blue-300 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  Keys are stored locally in your browser. They are never sent to our servers.
                </p>
              </div>
            </div>
          )}

          {/* Model */}
          {activeSection === "model" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[18px] font-semibold mb-1">Model Configuration</h2>
                <p className="text-[13px] text-[#636366]">LLM provider and generation parameters</p>
              </div>

              <div className="space-y-4">
                {/* Provider */}
                <div className="p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06]">
                  <label className="text-[13px] font-medium mb-3 block">Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["groq", "openai", "anthropic", "ollama"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          updateModel("provider", p);
                          updateModel("model", MODEL_OPTIONS[p][0]);
                        }}
                        className={`px-3 py-2 rounded-lg text-[13px] capitalize transition-all ${
                          settings.model.provider === p
                            ? "bg-white/[0.08] text-white ring-1 ring-white/[0.12]"
                            : "bg-white/[0.02] text-[#636366] hover:bg-white/[0.04]"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model selection */}
                <div className="p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06]">
                  <label className="text-[13px] font-medium mb-2 block">Model</label>
                  <select
                    value={settings.model.model}
                    onChange={(e) => updateModel("model", e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.03] rounded-lg text-[13px] text-[#e5e5e7] outline-none focus:ring-1 focus:ring-white/[0.1]"
                  >
                    {MODEL_OPTIONS[settings.model.provider]?.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Temperature */}
                <div className="p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium">Temperature</label>
                    <span className="text-[13px] text-[#8b949e] font-mono">
                      {settings.model.temperature}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={settings.model.temperature}
                    onChange={(e) => updateModel("temperature", parseFloat(e.target.value))}
                    className="w-full accent-white"
                  />
                  <div className="flex justify-between text-[11px] text-[#636366] mt-1">
                    <span>Precise (0)</span>
                    <span>Balanced (1)</span>
                    <span>Creative (2)</span>
                  </div>
                </div>

                {/* Max tokens */}
                <div className="p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium">Max Tokens</label>
                    <span className="text-[13px] text-[#8b949e] font-mono">
                      {settings.model.maxTokens.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={256}
                    max={8192}
                    step={256}
                    value={settings.model.maxTokens}
                    onChange={(e) => updateModel("maxTokens", parseInt(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Embedding */}
          {activeSection === "embedding" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[18px] font-semibold mb-1">Embedding</h2>
                <p className="text-[13px] text-[#636366]">Vector embedding configuration</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06]">
                  <label className="text-[13px] font-medium mb-3 block">Provider</label>
                  <div className="flex gap-2">
                    {(["openai", "jina", "ollama"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            embedding: {
                              ...prev.embedding,
                              provider: p,
                              model: p === "openai" ? "text-embedding-3-small" : p === "jina" ? "jina-embeddings-v3" : "nomic-embed-text",
                            },
                          }))
                        }
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] capitalize transition-all ${
                          settings.embedding.provider === p
                            ? "bg-white/[0.08] text-white ring-1 ring-white/[0.12]"
                            : "bg-white/[0.02] text-[#636366] hover:bg-white/[0.04]"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06]">
                  <label className="text-[13px] font-medium mb-2 block">Model</label>
                  <input
                    type="text"
                    value={settings.embedding.model}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        embedding: { ...prev.embedding, model: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white/[0.03] rounded-lg text-[13px] text-[#e5e5e7] outline-none focus:ring-1 focus:ring-white/[0.1] font-mono"
                  />
                </div>

                {settings.embedding.provider === "ollama" && (
                  <div className="p-4 rounded-xl bg-amber-500/5 ring-1 ring-amber-500/10">
                    <p className="text-[12px] text-amber-300 flex items-start gap-2">
                      <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                      Make sure Ollama is running locally on port 11434
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
