import { useState, useTransition } from "react";
import { Folder, FolderOpen, File, Plus, Trash2, Smartphone, Terminal, Github, RefreshCw, Layers, Key, Check, Info, AlertTriangle, FileCode } from "lucide-react";
import { FileNode, ADBDevice, EditorTab } from "../types";

interface SidebarProps {
  projectTree: FileNode;
  activeTab: EditorTab | null;
  onFileSelect: (path: string) => void;
  onCreateFile: (parentPath: string, name: string, isDir: boolean) => void;
  onDeleteFile: (path: string) => void;
  adbDevices: ADBDevice[];
  onAddAdbDevice: (device: ADBDevice) => void;
  onSelectAdbDevice: (deviceId: string) => void;
  selectedAdbDevice: string | null;
  onLogcatEmit: (tag: string, message: string, level?: "V" | "D" | "I" | "W" | "E") => void;
  onGenerateReadme: (repoUrl: string) => void;
  onGenerateDesc: (repoUrl: string) => void;
  githubToken: string;
  onSetGithubToken: (token: string) => void;
}

export default function Sidebar({
  projectTree,
  onFileSelect,
  onCreateFile,
  onDeleteFile,
  adbDevices,
  onAddAdbDevice,
  onSelectAdbDevice,
  selectedAdbDevice,
  onLogcatEmit,
  onGenerateReadme,
  onGenerateDesc,
  githubToken,
  onSetGithubToken,
}: SidebarProps) {
  const [activePanel, setActivePanel] = useState<"explorer" | "adb" | "github">("explorer");

  // File Explorer helper states
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "": true, // Root expanded
    app: true,
    "app/src": true,
    "app/src/main": true,
    "app/src/main/java": true,
    "app/src/main/res": true,
    "app/src/main/res/layout": true,
  });
  const [newFileInput, setNewFileInput] = useState<{ parentPath: string; isDir: boolean } | null>(null);
  const [newFileName, setNewFileName] = useState("");

  // ADB helper states
  const [pairingIp, setPairingIp] = useState("192.168.1.100:5555");
  const [pairingCode, setPairingCode] = useState("123456");
  const [isPairing, setIsPairing] = useState(false);

  // GitHub States
  const [isGithubConnected, setIsGithubConnected] = useState(!!githubToken);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [analyzingRepo, setAnalyzingRepo] = useState(false);
  const [repoAnalysis, setRepoAnalysis] = useState<any>(null);

  const [, startTransition] = useTransition();

  const toggleNode = (path: string) => {
    setExpandedNodes((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCreateSubmit = (parentPath: string, isDir: boolean) => {
    if (!newFileName.trim()) return;
    onCreateFile(parentPath, newFileName, isDir);
    setNewFileName("");
    setNewFileInput(null);
  };

  const startPairing = () => {
    if (isPairing) return;
    setIsPairing(true);
    onLogcatEmit("ADB", `Connecting to physical device at ${pairingIp}...`, "I");
    onLogcatEmit("ADB", `Using pairing code ${pairingCode}...`, "I");

    setTimeout(() => {
      setIsPairing(false);
      const newDev: ADBDevice = {
        id: "physical-" + Math.floor(Math.random() * 10000),
        name: "My Physical Android Phone",
        type: "physical",
        status: "online",
        ipAddress: pairingIp,
      };
      onAddAdbDevice(newDev);
      onLogcatEmit("ADB", `Successfully paired with physical device at ${pairingIp}!`, "I");
    }, 2000);
  };

  const connectToMockGithub = () => {
    if (!githubToken.trim()) return;
    setIsGithubConnected(true);
    onLogcatEmit("GitHub", "Successfully authenticated with GitHub PAT.", "I");
  };

  const triggerRepoAnalysis = async (repoUrl: string) => {
    if (!repoUrl) return;
    setAnalyzingRepo(true);
    onLogcatEmit("GitHub", `Downloading and parsing repository headers: ${repoUrl}`, "I");

    try {
      const response = await fetch("/api/github/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          files: ["app/src/main/AndroidManifest.xml", "app/build.gradle", "MainActivity.kt"],
        }),
      });

      const data = await response.json();
      if (response.ok && data.analysis) {
        setRepoAnalysis(data.analysis);
        onLogcatEmit("GitHub", "Repository analysis completed successfully.", "D");
      }
    } catch (err: any) {
      onLogcatEmit("GitHub", `Analysis error: ${err.message}`, "E");
    } finally {
      setAnalyzingRepo(false);
    }
  };

  // Recursive render function for the Project Tree
  const renderTree = (node: FileNode) => {
    const isExpanded = expandedNodes[node.path];
    const isDir = node.type === "directory";

    return (
      <div id={`node-${node.path.replace(/\//g, "-")}`} key={node.path} className="pl-3.5 font-mono text-[11px]">
        <div className="flex items-center justify-between group py-1 px-1.5 rounded hover:bg-slate-900/60 transition-colors">
          <div
            onClick={() => {
              if (isDir) toggleNode(node.path);
              else onFileSelect(node.path);
            }}
            className="flex items-center gap-1.5 flex-1 cursor-pointer select-none text-slate-300 hover:text-slate-100 max-w-[80%] truncate"
          >
            {isDir ? (
              isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )
            ) : (
              <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className={isDir ? "font-semibold font-sans text-xs" : "font-mono"}>{node.name}</span>
          </div>

          {/* Action buttons (only show on hover for neatness) */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
            {isDir && (
              <>
                <button
                  onClick={() => setNewFileInput({ parentPath: node.path, isDir: false })}
                  className="p-0.5 text-slate-400 hover:text-emerald-400 cursor-pointer"
                  title="New File"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setNewFileInput({ parentPath: node.path, isDir: true })}
                  className="p-0.5 text-slate-400 hover:text-emerald-400 cursor-pointer"
                  title="New Directory"
                >
                  <Folder className="w-2.5 h-2.5" />
                </button>
              </>
            )}
            {node.path !== "" && (
              <button
                onClick={() => onDeleteFile(node.path)}
                className="p-0.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Input box for new file/folder */}
        {newFileInput && newFileInput.parentPath === node.path && (
          <div className="pl-4 py-1 flex items-center gap-1">
            {newFileInput.isDir ? (
              <Folder className="w-3 h-3 text-emerald-500" />
            ) : (
              <File className="w-3 h-3 text-slate-400" />
            )}
            <input
              type="text"
              placeholder={newFileInput.isDir ? "Directory name" : "filename.kt"}
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateSubmit(node.path, newFileInput.isDir);
                else if (e.key === "Escape") setNewFileInput(null);
              }}
              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200 outline-none w-28 focus:border-emerald-500"
              autoFocus
            />
            <button
              onClick={() => handleCreateSubmit(node.path, newFileInput.isDir)}
              className="bg-emerald-500 text-white rounded p-0.5 hover:bg-emerald-600 cursor-pointer"
            >
              <Check className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {/* Children Render */}
        {isDir && isExpanded && node.children && (
          <div className="border-l border-slate-800/80 ml-2 mt-0.5">
            {node.children.map((child) => renderTree(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="sidebar-container" className="bg-slate-950 border border-slate-800 rounded-xl flex h-full overflow-hidden shadow-inner">
      {/* Quick Panels utility tab rail */}
      <div className="w-14 bg-slate-900/60 border-r border-slate-800/80 flex flex-col items-center py-4 gap-4">
        <button
          onClick={() => startTransition(() => setActivePanel("explorer"))}
          className={`p-2.5 rounded-lg transition-colors cursor-pointer relative ${
            activePanel === "explorer" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
          }`}
          title="Project Tree Explorer"
        >
          <Layers className="w-5 h-5" />
        </button>
        <button
          onClick={() => startTransition(() => setActivePanel("adb"))}
          className={`p-2.5 rounded-lg transition-colors cursor-pointer relative ${
            activePanel === "adb" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
          }`}
          title="ADB Device Manager"
        >
          <Smartphone className="w-5 h-5" />
        </button>
        <button
          onClick={() => startTransition(() => setActivePanel("github"))}
          className={`p-2.5 rounded-lg transition-colors cursor-pointer relative ${
            activePanel === "github" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
          }`}
          title="GitHub Sync"
        >
          <Github className="w-5 h-5" />
        </button>
      </div>

      {/* Main Panel Content Container */}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {/* PANEL 1: PROJECT EXPLORER */}
        {activePanel === "explorer" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans">
                Project Explorer
              </span>
              <button
                onClick={() => setNewFileInput({ parentPath: "", isDir: false })}
                className="bg-slate-900 hover:bg-slate-800 text-emerald-400 p-1 rounded border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                title="New Root File"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-2 space-y-1 select-none">
              {renderTree(projectTree)}
            </div>
          </div>
        )}

        {/* PANEL 2: ADB DEVICE MANAGER */}
        {activePanel === "adb" && (
          <div className="space-y-4 animate-fade-in">
            <div className="pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans">
                ADB Device Manager
              </span>
            </div>

            {/* Devices list */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">
                Active ADB Targets
              </span>
              {adbDevices.map((device) => (
                <div
                  id={`adb-${device.id}`}
                  key={device.id}
                  onClick={() => onSelectAdbDevice(device.id)}
                  className={`p-3 rounded-lg border flex justify-between items-center transition-all cursor-pointer ${
                    selectedAdbDevice === device.id
                      ? "bg-emerald-500/10 border-emerald-500/45"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className={`w-4 h-4 ${device.status === "online" ? "text-emerald-400" : "text-slate-500"}`} />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-200">{device.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                        {device.ipAddress || device.id} • {device.type}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase ${
                    device.status === "online" 
                      ? "bg-emerald-500/10 text-emerald-400" 
                      : "bg-rose-500/10 text-rose-400"
                  }`}>
                    {device.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Physical Device Pairing (WebADB) */}
            <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300">Pair Physical Device</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Connect your physical phone using **Wireless Debugging** (Android 11+) over Wi-Fi, or connect via USB.
              </p>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">
                    IP Address & Port
                  </label>
                  <input
                    type="text"
                    value={pairingIp}
                    onChange={(e) => setPairingIp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">
                    Wi-Fi Pairing Code
                  </label>
                  <input
                    type="text"
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  onClick={startPairing}
                  disabled={isPairing}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-[10px] py-1.5 px-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isPairing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pairing...
                    </>
                  ) : (
                    "Pair Device Wireless"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PANEL 3: GITHUB INTEGRATION */}
        {activePanel === "github" && (
          <div className="space-y-4 animate-fade-in">
            <div className="pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans">
                GitHub Synchronization
              </span>
            </div>

            {/* Login section */}
            {!isGithubConnected ? (
              <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5">
                  <Github className="w-4 h-4 text-slate-300" />
                  <span className="text-xs font-bold text-slate-300">Sync with GitHub</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Provide your GitHub personal access token to clone repos, inspect codebases, and generate auto descriptions.
                </p>

                <div className="space-y-2.5">
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => onSetGithubToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={connectToMockGithub}
                    disabled={!githubToken}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] py-1.5 px-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer flex justify-center items-center gap-1.5 disabled:opacity-50"
                  >
                    <Key className="w-3.5 h-3.5 text-emerald-400" /> Authenticate GitHub
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <p className="text-[11px] font-bold text-slate-200">Connected to GitHub</p>
                    <p className="text-[9px] text-slate-400 font-mono">Scopes: repo, workflow</p>
                  </div>
                </div>

                {/* Clone template repos */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">
                    Select Android Repositories
                  </span>
                  <select
                    value={selectedRepo}
                    onChange={(e) => {
                      setSelectedRepo(e.target.value);
                      triggerRepoAnalysis(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose Repository --</option>
                    <option value="https://github.com/android/architecture-templates">
                      architecture-templates (Empty Architecture)
                    </option>
                    <option value="https://github.com/google/compose-samples">
                      compose-samples (Jetpack Compose samples)
                    </option>
                    <option value="https://github.com/everything4droid/mvi-boilerplate">
                      mvi-boilerplate (Kotlin Flow, Retrofit, Room)
                    </option>
                  </select>
                </div>

                {/* Analysis Loading */}
                {analyzingRepo && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2 text-xs text-slate-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Analyzing repository structure...</span>
                  </div>
                )}

                {/* Repository structure analysis panel */}
                {repoAnalysis && !analyzingRepo && (
                  <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-xl space-y-3 text-left">
                    <div className="flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-300">Structure Analysis</span>
                    </div>

                    <div className="space-y-1.5 font-mono text-[10px] text-slate-400">
                      <p>
                        <strong className="text-slate-300 font-sans">Build DSL:</strong> {repoAnalysis.detectedType}
                      </p>
                      <p>
                        <strong className="text-slate-300 font-sans">Package:</strong> {repoAnalysis.packageName}
                      </p>
                      <p>
                        <strong className="text-slate-300 font-sans">SDK Levels:</strong> Min {repoAnalysis.minSdkVersion} / Target {repoAnalysis.targetSdkVersion}
                      </p>
                      <div>
                        <strong className="text-slate-300 font-sans block mb-1">Found Components:</strong>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {repoAnalysis.components?.map((comp: string, i: number) => (
                            <span key={i} className="bg-slate-800 text-slate-300 text-[8px] px-1.5 py-0.5 rounded border border-slate-700">
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/80 pt-3 space-y-2">
                      <span className="text-[9px] text-slate-500 font-mono block uppercase">
                        AI Utilities
                      </span>
                      <button
                        onClick={() => onGenerateReadme(selectedRepo)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold py-1.5 px-3 rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5 text-cyan-400" /> Generate README.md
                      </button>
                      <button
                        onClick={() => onGenerateDesc(selectedRepo)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold py-1.5 px-3 rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Auto Project Description
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
