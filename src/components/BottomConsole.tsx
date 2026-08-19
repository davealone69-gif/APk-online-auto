import { useState, useTransition } from "react";
import { Terminal, Shield, Plus, Trash2, ListFilter, Download, RefreshCw, FileCode, CheckCircle, Package, Brain } from "lucide-react";
import { LogLine, GradleDependency } from "../types";

interface BottomConsoleProps {
  logs: LogLine[];
  onClearLogs: () => void;
  buildOutput: string[];
  dependencies: GradleDependency[];
  onAddDependency: (dep: Omit<GradleDependency, "id">) => void;
  onRemoveDependency: (id: string) => void;
  onTriggerSync: () => void;
  onDownloadApk: () => void;
  hasRealApk?: boolean;
  autoRepairMode?: boolean;
  onToggleAutoRepair?: (enabled: boolean) => void;
  knowledgeBase?: string[];
  setKnowledgeBase?: (kb: string[]) => void;
}

export default function BottomConsole({
  logs,
  onClearLogs,
  buildOutput,
  dependencies,
  onAddDependency,
  onRemoveDependency,
  onTriggerSync,
  onDownloadApk,
  hasRealApk = false,
  autoRepairMode = false,
  onToggleAutoRepair,
  knowledgeBase = [],
  setKnowledgeBase,
}: BottomConsoleProps) {
  const [activeTab, setActiveTab] = useState<"logcat" | "build" | "deps" | "signing" | "knowledge">("build");

  // Logcat level filter
  const [logLevelFilter, setLogLevelFilter] = useState<"V" | "D" | "I" | "W" | "E" | "ALL">("ALL");
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // Knowledge Base State
  const [newRule, setNewRule] = useState("");

  // Dependency Adding states
  const [newGroup, setNewGroup] = useState("");
  const [newName, setNewName] = useState("");
  const [newVersion, setNewVersion] = useState("");
  const [newScope, setNewScope] = useState<"implementation" | "api" | "testImplementation">("implementation");

  // APK Signing form states
  const [keystoreName, setKeystoreName] = useState("my-android-key.jks");
  const [keyAlias, setKeyAlias] = useState("releaseKey");
  const [keystorePass, setKeystorePass] = useState("••••••••");
  const [isSigning, setIsSigning] = useState(false);
  const [signedApkGenerated, setSignedApkGenerated] = useState(false);

  const [, startTransition] = useTransition();

  const handleAddDependencySubmit = () => {
    if (!newGroup.trim() || !newName.trim() || !newVersion.trim()) return;
    onAddDependency({
      group: newGroup,
      name: newName,
      version: newVersion,
      scope: newScope === "testImplementation" ? "testImplementation" : "implementation",
    });
    setNewGroup("");
    setNewName("");
    setNewVersion("");
  };

  const startApkSigning = () => {
    setIsSigning(true);
    setSignedApkGenerated(false);
    setTimeout(() => {
      setIsSigning(false);
      setSignedApkGenerated(true);
    }, 2000);
  };

  // Filter Logcat Logs
  const filteredLogs = logs.filter((log) => {
    const matchesLevel = logLevelFilter === "ALL" || log.level === logLevelFilter;
    const matchesSearch =
      !logSearchQuery ||
      log.tag.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(logSearchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div id="bottom-console-container" className="bg-slate-950 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden shadow-inner">
      {/* Console Tab Selectors bar */}
      <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => startTransition(() => setActiveTab("build"))}
            className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "build" ? "bg-slate-800 text-emerald-400 border border-slate-750" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Build Output
          </button>
          <button
            onClick={() => startTransition(() => setActiveTab("logcat"))}
            className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "logcat" ? "bg-slate-800 text-emerald-400 border border-slate-750" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Live Logcat
          </button>
          <button
            onClick={() => startTransition(() => setActiveTab("deps"))}
            className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "deps" ? "bg-slate-800 text-emerald-400 border border-slate-750" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Dependency Inspector
          </button>
          <button
            onClick={() => startTransition(() => setActiveTab("signing"))}
            className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "signing" ? "bg-slate-800 text-emerald-400 border border-slate-750" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            APK Signing & Export
          </button>
          <button
            onClick={() => startTransition(() => setActiveTab("knowledge"))}
            className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === "knowledge" ? "bg-slate-800 text-emerald-400 border border-slate-750" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Brain className="w-3.5 h-3.5" /> AI Knowledge Base
          </button>
        </div>

        {/* Clear console or sync action button */}
        <div className="flex items-center gap-3">
          {activeTab === "build" && (
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoRepairMode} 
                onChange={(e) => onToggleAutoRepair?.(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950" 
              />
              AI Auto-Repair
            </label>
          )}
          {activeTab === "logcat" && (
            <button
              onClick={onClearLogs}
              className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              Clear Logcat
            </button>
          )}
        </div>
      </div>

      {/* Console Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-left scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {/* SUBTAB 1: BUILD LOGS */}
        {activeTab === "build" && (
          <div className="space-y-1 text-slate-300 select-text animate-fade-in leading-relaxed">
            {buildOutput.length === 0 ? (
              <div className="text-slate-500 py-4 flex flex-col items-center justify-center">
                <Terminal className="w-8 h-8 text-slate-700 mb-2" />
                <p>No builds triggered yet.</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Click 'Build APK' on the toolbar to package the sources.</p>
              </div>
            ) : (
              buildOutput.map((line, idx) => {
                let colorClass = "text-slate-300";
                if (line.includes("ERROR") || line.includes("FAILED")) colorClass = "text-rose-400 font-bold";
                else if (line.includes("Task :")) colorClass = "text-cyan-400 font-semibold";
                else if (line.includes("SUCCESSFUL")) colorClass = "text-emerald-400 font-bold";
                else if (line.includes("warning")) colorClass = "text-amber-400";

                return (
                  <p id={`build-line-${idx}`} key={idx} className={`${colorClass}`}>
                    {line}
                  </p>
                );
              })
            )}
          </div>
        )}

        {/* SUBTAB 2: LIVE LOGCAT */}
        {activeTab === "logcat" && (
          <div className="space-y-2 select-text animate-fade-in">
            {/* Filter Logcat tool controls */}
            <div className="flex flex-wrap gap-2.5 items-center pb-3 border-b border-slate-900 z-10 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2 py-1">
                <ListFilter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={logLevelFilter}
                  onChange={(e) => setLogLevelFilter(e.target.value as any)}
                  className="bg-transparent text-slate-300 outline-none border-none text-[11px] font-sans font-medium"
                >
                  <option value="ALL">All Levels</option>
                  <option value="V">Verbose (V)</option>
                  <option value="D">Debug (D)</option>
                  <option value="I">Info (I)</option>
                  <option value="W">Warn (W)</option>
                  <option value="E">Error (E)</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="Filter tag or message..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-[11px] text-slate-300 outline-none w-44 font-sans"
              />
            </div>

            {/* List log outputs */}
            <div className="space-y-1.5 pt-2 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <p className="text-slate-600 text-center py-4 font-sans">No log records match filters.</p>
              ) : (
                filteredLogs.map((log) => {
                  let badgeColor = "bg-slate-800 text-slate-400";
                  let textColor = "text-slate-300";

                  if (log.level === "E") {
                    badgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/15";
                    textColor = "text-rose-300";
                  } else if (log.level === "W") {
                    badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/15";
                    textColor = "text-amber-300";
                  } else if (log.level === "I") {
                    badgeColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15";
                    textColor = "text-emerald-200";
                  } else if (log.level === "D") {
                    badgeColor = "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15";
                    textColor = "text-cyan-200";
                  }

                  return (
                    <div id={`log-${log.id}`} key={log.id} className="flex gap-2 items-start py-0.5 border-b border-slate-900/40">
                      <span className="text-slate-500 font-medium tracking-tighter w-14 shrink-0">{log.timestamp}</span>
                      <span className={`text-[9px] font-bold px-1.5 rounded uppercase shrink-0 ${badgeColor}`}>{log.level}</span>
                      <span className="text-emerald-400 font-semibold shrink-0 min-w-[80px] truncate">{log.tag}:</span>
                      <span className={`flex-1 select-all break-all ${textColor}`}>{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 3: DEPENDENCY INSPECTOR */}
        {activeTab === "deps" && (
          <div className="space-y-4 animate-fade-in text-left">
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
              Visual Gradle dependencies inspector. Add or remove packages to your dynamic Android project.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Add Dependency inputs */}
              <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-xl space-y-3 md:col-span-1">
                <span className="text-xs font-bold text-slate-300 font-sans block">Add New Dependency</span>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Group (e.g. androidx.core)"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Name (e.g. core-ktx)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Version (e.g. 1.12.0)"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-emerald-500"
                  />
                  <select
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-slate-300 outline-none focus:border-emerald-500"
                  >
                    <option value="implementation">Implementation (compile)</option>
                    <option value="testImplementation">Test Implementation</option>
                  </select>
                  <button
                    onClick={handleAddDependencySubmit}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-[10px] py-1.5 px-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Inject Package
                  </button>
                </div>
              </div>

              {/* Dependencies List */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Active Dependencies</span>
                  <button
                    onClick={onTriggerSync}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] py-1 px-2.5 rounded border border-slate-800 transition-all flex items-center gap-1 cursor-pointer font-sans font-semibold"
                  >
                    <RefreshCw className="w-3 h-3 text-cyan-400" /> Sync Project
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-thin">
                  {dependencies.map((dep) => (
                    <div
                      id={`dep-${dep.id}`}
                      key={dep.id}
                      className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-850 rounded-lg hover:border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-200 font-sans font-medium">{dep.group}:{dep.name}</p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                            Version: {dep.version} • {dep.scope}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveDependency(dep.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 cursor-pointer transition-colors"
                        title="Remove Dependency"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: APK SIGNING & EXPORT */}
        {activeTab === "signing" && (
          <div className="space-y-4 animate-fade-in text-left">
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
              Create a custom Android Keystore configuration to sign the release-ready application and compile a signed .apk bundle.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Form Inputs */}
              <div className="space-y-3 bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs font-bold text-slate-300 font-sans block">Keystore Credentials</span>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-0.5">Keystore File Name</label>
                    <input
                      type="text"
                      value={keystoreName}
                      onChange={(e) => setKeystoreName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-0.5">Key Alias</label>
                    <input
                      type="text"
                      value={keyAlias}
                      onChange={(e) => setKeyAlias(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-0.5">Keystore Password</label>
                    <input
                      type="password"
                      value={keystorePass}
                      onChange={(e) => setKeystorePass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  onClick={startApkSigning}
                  disabled={isSigning}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs py-2 px-4 rounded-lg transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSigning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compiling & Signing Release APK...
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5" /> Sign & Assemble Release APK
                    </>
                  )}
                </button>
              </div>

              {/* Output Download */}
              <div className="flex flex-col justify-center items-center text-center p-4">
                {signedApkGenerated || hasRealApk ? (
                  <div className="space-y-3 animate-fade-in">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-slate-200">{hasRealApk ? "Cloud Build APK Ready!" : "Signed APK Generated successfully!"}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Filename: {hasRealApk ? "app-debug.apk (from GitHub)" : "app-release-signed.apk"}</p>
                    </div>
                    <button
                      onClick={onDownloadApk}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 hover:border-slate-650 font-sans font-bold text-[11px] py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-lg shadow-black/20"
                    >
                      <Download className="w-4 h-4" /> {hasRealApk ? "Download Cloud APK" : "Download Signed APK"}
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-500">
                    <FileCode className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs">Provide keys on the left to compile release bundle.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Knowledge Base Tab */}
        {activeTab === "knowledge" && (
          <div className="h-full flex flex-col p-4 bg-slate-900/50">
            <div className="mb-4 text-xs text-slate-400">
              Add explicit instructions, preferred AGP versions, or known fixes. 
              The Auto-Repair AI uses this list when resolving cloud build failures.
            </div>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="e.g. Always use AGP 8.2.0, or Always add coreLibraryDesugaring"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newRule.trim() && setKnowledgeBase) {
                    setKnowledgeBase([...knowledgeBase, newRule.trim()]);
                    setNewRule("");
                  }
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => {
                  if (newRule.trim() && setKnowledgeBase) {
                    setKnowledgeBase([...knowledgeBase, newRule.trim()]);
                    setNewRule("");
                  }
                }}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 border border-emerald-500/30 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Rule
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {knowledgeBase.length === 0 ? (
                <div className="text-center text-slate-600 text-xs py-8">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No learned or manual rules yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {knowledgeBase.map((rule, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 bg-slate-950/50 border border-slate-800/80 rounded p-2.5 group">
                      <p className="text-xs text-slate-300 font-mono flex-1 whitespace-pre-wrap leading-relaxed">{rule}</p>
                      <button
                        onClick={() => {
                          if (setKnowledgeBase) {
                            setKnowledgeBase(knowledgeBase.filter((_, i) => i !== idx));
                          }
                        }}
                        className="text-slate-600 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Remove Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
