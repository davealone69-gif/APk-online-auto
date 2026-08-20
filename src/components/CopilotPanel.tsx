import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, AlertCircle, FileText, Check, Copy } from "lucide-react";
import { ChatMessage, EditorTab } from "../types";
import ReactMarkdown from "react-markdown";

interface CopilotPanelProps {
  activeTab: EditorTab | null;
  onApplyCode: (newCode: string) => void;
  onLogcatEmit: (tag: string, message: string, level?: "V" | "D" | "I" | "W" | "E") => void;
}

export default function CopilotPanel({
  activeTab,
  onApplyCode,
  onLogcatEmit,
}: CopilotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: "Hello Developer! I am your **Android AI Copilot**. I can help you generate Kotlin/Java code, write layout XML templates, debug compile errors, and auto-generate Gradle files or manifest updates. What are we building today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastSuggestedCode, setLastSuggestedCode] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    onLogcatEmit("AICopilot", `Prompting Ollama: "${textToSend.substring(0, 40)}..."`, "I");

    // Gather active file context
    let promptWithContext = textToSend;
    if (activeTab) {
      promptWithContext += `\n\n[Active File Context: ${activeTab.name} (${activeTab.language})]\n\`\`\`${activeTab.language}\n${activeTab.content}\n\`\`\``;
    }

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptWithContext,
          systemInstruction: "You are an expert Android development assistant embedded in Everything4Droid IDE. Provide direct, clean Android code solutions in Kotlin, Java, XML, or Gradle. Format code blocks clearly with markdown syntax.",
        }),
      });

      const data = await response.json();
      if (response.ok && data.text) {
        // Detect if there's a code block in the response to offer an "Apply to Editor" action
        const codeBlockRegex = /```(?:kotlin|java|xml|gradle|json|markdown)?\n([\s\S]*?)```/i;
        const match = data.text.match(codeBlockRegex);
        if (match && match[1]) {
          setLastSuggestedCode(match[1]);
        } else {
          setLastSuggestedCode(null);
        }

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        onLogcatEmit("AICopilot", "Received assistance response from Ollama.", "D");
      } else {
        throw new Error(data.error || "Failed to generate copilot response");
      }
    } catch (err: any) {
      onLogcatEmit("AICopilot", `Error: ${err.message}`, "E");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: `⚠️ **Error communicating with AI:** ${err.message}. Please verify your API keys and try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const applyFixToEditor = () => {
    if (lastSuggestedCode) {
      onApplyCode(lastSuggestedCode);
      onLogcatEmit("AICopilot", "Applied code suggestion to active editor tab.", "I");
      setLastSuggestedCode(null);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: "✅ Applied the code suggestion directly to your active editor!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  };

  const handleQuickAction = (action: string) => {
    let prompt = "";
    if (action === "explain") {
      prompt = `Explain the purpose of this file, detailing class definitions, functions, and layout structures. Keep it brief.`;
    } else if (action === "optimize") {
      prompt = `Refactor and optimize this file for better performance, memory management, and Kotlin/Java best practices. Return the complete updated file code within markdown blocks.`;
    } else if (action === "document") {
      prompt = `Generate high-quality KDoc / JavaDoc API documentation and header comments for this file. Return the updated file code.`;
    } else if (action === "add_perm") {
      prompt = `Help me add an Android permission (e.g., Camera or Internet) to my AndroidManifest.xml. Output the complete updated XML block.`;
    }

    handleSend(prompt);
  };

  return (
    <div id="copilot-panel" className="bg-slate-950 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden shadow-inner relative">
      {/* Copilot Header */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
          <Bot className="w-5 h-5 text-emerald-400" />
          <h3 className="text-xs font-bold font-sans text-slate-200 tracking-wider uppercase">
            Everything4Droid AI Copilot
          </h3>
        </div>
        {activeTab && (
          <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded border border-slate-700 max-w-[120px] truncate">
            Context: {activeTab.name}
          </span>
        )}
      </div>

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.map((msg) => (
          <div
            id={`msg-${msg.id}`}
            key={msg.id}
            className={`flex flex-col max-w-[85%] ${
              msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-500 font-mono">
              {msg.sender === "ai" ? (
                <>
                  <Bot className="w-3 h-3 text-emerald-400" />
                  <span className="font-semibold text-emerald-500">COPILOT</span>
                </>
              ) : (
                <span className="font-semibold text-slate-400">YOU</span>
              )}
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>
            <div
              className={`rounded-xl p-3 shadow-md border ${
                msg.sender === "user"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-slate-200"
                  : "bg-slate-900 border-slate-800 text-slate-300"
              }`}
            >
              <div className="markdown-body prose prose-invert max-w-none text-xs leading-relaxed space-y-1.5">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col items-start max-w-[85%] animate-pulse">
            <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-500 font-mono">
              <Bot className="w-3 h-3 text-emerald-400" />
              <span className="font-semibold text-emerald-500">COPILOT THINKING...</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>Analyzing sources & preparing suggestion...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Code Action overlay if available */}
      {lastSuggestedCode && (
        <div className="mx-4 my-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between gap-3 animate-fade-in z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <p className="text-[11px] font-bold text-slate-200 font-sans">
                Code Suggestion Detected
              </p>
              <p className="text-[9px] text-slate-400 font-sans mt-0.5">
                You can insert this solution directly into your active editor tab.
              </p>
            </div>
          </div>
          <button
            onClick={applyFixToEditor}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[10px] py-1.5 px-3 rounded-md flex items-center gap-1 transition-all shadow shadow-emerald-500/15 cursor-pointer"
          >
            <Check className="w-3 h-3" /> Apply Code
          </button>
        </div>
      )}

      {/* Quick Actions Panel if there is active tab context */}
      {activeTab && (
        <div className="px-4 py-2 bg-slate-900/40 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none z-10">
          <button
            onClick={() => handleQuickAction("explain")}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-semibold text-slate-300 py-1 px-2.5 rounded-full transition-all cursor-pointer"
          >
            <FileText className="w-3 h-3 text-cyan-400" /> Explain
          </button>
          <button
            onClick={() => handleQuickAction("optimize")}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-semibold text-slate-300 py-1 px-2.5 rounded-full transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-400" /> Optimize Code
          </button>
          <button
            onClick={() => handleQuickAction("document")}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-semibold text-slate-300 py-1 px-2.5 rounded-full transition-all cursor-pointer"
          >
            <FileText className="w-3 h-3 text-emerald-400" /> Add Docs
          </button>
          <button
            onClick={() => handleQuickAction("add_perm")}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-semibold text-slate-300 py-1 px-2.5 rounded-full transition-all cursor-pointer"
          >
            <AlertCircle className="w-3 h-3 text-indigo-400" /> Add Permission
          </button>
        </div>
      )}

      {/* Input Chat Panel */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center z-10">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend(inputValue)}
          placeholder={activeTab ? "Ask copilot to code, explain, or fix..." : "Ask copilot anything Android..."}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-2 px-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
        />
        <button
          onClick={() => handleSend(inputValue)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-lg shadow-emerald-500/10"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
