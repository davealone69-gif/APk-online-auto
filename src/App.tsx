import { useState, useEffect, useRef } from "react";
import { Layers, Bot, Smartphone, Terminal, Github, Sparkles, Code, Play, RefreshCw, Cpu } from "lucide-react";
import { FileNode, EditorTab, Diagnostic, ADBDevice, LogLine, GradleDependency } from "./types";
import { initialProjectTree } from "./initialProject";
import Sidebar from "./components/Sidebar";
import EditorArea from "./components/EditorArea";
import DeviceEmulator from "./components/DeviceEmulator";
import BottomConsole from "./components/BottomConsole";
import CopilotPanel from "./components/CopilotPanel";
import { createOrGetRepo, pushFilesToRepo, pollWorkflowRun, getArtifactDownloadUrl, getFailedJobLog, fetchGitHubUser } from "./utils/githubApi";

export default function App() {
  // Main states
  const [projectTree, setProjectTree] = useState<FileNode>(() => {
    const saved = localStorage.getItem("e4d_projectTree");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialProjectTree;
  });
  const [openTabs, setOpenTabs] = useState<EditorTab[]>(() => {
    const saved = localStorage.getItem("e4d_openTabs");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    return localStorage.getItem("e4d_activeTabId") || null;
  });
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  
  // GitHub Integration State
  const [githubToken, setGithubToken] = useState<string>(() => {
    return localStorage.getItem("e4d_githubToken") || "";
  });
  const [apkDownloadUrl, setApkDownloadUrl] = useState<string | null>(null);
  
  // Auto Repair State
  const [autoRepairMode, setAutoRepairMode] = useState<boolean>(false);
  const [knowledgeBase, setKnowledgeBase] = useState<string[]>(() => {
    const saved = localStorage.getItem("e4d_knowledgeBase");
    return saved ? JSON.parse(saved) : [];
  });
  
  // ADB Devices
  const [adbDevices, setAdbDevices] = useState<ADBDevice[]>([
    { id: "emulator-5554", name: "Pixel 8 Pro Emulator", type: "emulator", status: "online" },
  ]);
  const [selectedAdbDevice, setSelectedAdbDevice] = useState<string | null>("emulator-5554");

  // Logs & Console Outputs
  const [logs, setLogs] = useState<LogLine[]>([
    { id: "1", timestamp: "06:46:37", level: "I", tag: "ADB", message: "adb daemon started successfully on port 5037" },
    { id: "2", timestamp: "06:46:38", level: "D", tag: "DeviceMonitor", message: "Device [emulator-5554] connected online" },
    { id: "3", timestamp: "06:46:39", level: "I", tag: "SystemServer", message: "Everything4Droid core framework loaded. Ready to build." },
  ]);
  const [buildOutput, setBuildOutput] = useState<string[]>([]);
  const [isEmulatorRunning, setIsEmulatorRunning] = useState(false);

  // Gradle Dependencies
  const [dependencies, setDependencies] = useState<GradleDependency[]>([
    { id: "1", group: "androidx.core", name: "core-ktx", version: "1.12.0", scope: "implementation" },
    { id: "2", group: "androidx.appcompat", name: "appcompat", version: "1.6.1", scope: "implementation" },
    { id: "3", group: "com.google.android.material", name: "material", version: "1.11.0", scope: "implementation" },
    { id: "4", group: "androidx.constraintlayout", name: "constraintlayout", version: "2.1.4", scope: "implementation" },
    { id: "5", group: "junit", name: "junit", version: "4.13.2", scope: "testImplementation" },
  ]);

  const activeTabRef = useRef<string | null>(null);
  activeTabRef.current = activeTabId;

  // Auto-open activity_main.xml and MainActivity.kt on initial load if no tabs are open
  useEffect(() => {
    if (openTabs.length > 0) return; // Don't override restored tabs

    const mainXml = findFileByPath(initialProjectTree, "app/src/main/res/layout/activity_main.xml");
    const mainActivity = findFileByPath(initialProjectTree, "app/src/main/java/com/example/droidapp/MainActivity.kt");

    const initialTabs: EditorTab[] = [];
    if (mainXml) {
      initialTabs.push({
        path: mainXml.path,
        name: mainXml.name,
        content: mainXml.content || "",
        isDirty: false,
        language: "xml",
      });
    }
    if (mainActivity) {
      initialTabs.push({
        path: mainActivity.path,
        name: mainActivity.name,
        content: mainActivity.content || "",
        isDirty: false,
        language: "kotlin",
      });
    }

    setOpenTabs(initialTabs);
    if (initialTabs.length > 0) {
      setActiveTabId(initialTabs[0].path);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("e4d_projectTree", JSON.stringify(projectTree));
  }, [projectTree]);

  useEffect(() => {
    localStorage.setItem("e4d_openTabs", JSON.stringify(openTabs));
  }, [openTabs]);

  useEffect(() => {
    if (activeTabId) {
      localStorage.setItem("e4d_activeTabId", activeTabId);
    } else {
      localStorage.removeItem("e4d_activeTabId");
    }
  }, [activeTabId]);

  useEffect(() => {
    localStorage.setItem("e4d_githubToken", githubToken);
  }, [githubToken]);

  useEffect(() => {
    localStorage.setItem("e4d_knowledgeBase", JSON.stringify(knowledgeBase));
  }, [knowledgeBase]);

  // Real-time linting and syntax check
  useEffect(() => {
    if (!activeTabId) return;
    const activeTab = openTabs.find((t) => t.path === activeTabId);
    if (!activeTab) return;

    const newDiagnostics: Diagnostic[] = [];

    // Simple lint parser rule for XML
    if (activeTab.language === "xml") {
      // Check for unclosed tags or mismatched angle brackets
      const xml = activeTab.content;
      const openBrackets = (xml.match(/</g) || []).length;
      const closeBrackets = (xml.match(/>/g) || []).length;
      if (openBrackets !== closeBrackets) {
        newDiagnostics.push({
          line: xml.split("\n").length - 1 || 1,
          message: "Syntax Error: Mismatched tag brackets '<' or '>'. Verify tag closure.",
          severity: "error",
        });
      }
      if (!xml.includes('xmlns:android="http://schemas.android.com/apk/res/android"')) {
        newDiagnostics.push({
          line: 2,
          message: "Warning: Missing Android namespace declaration (xmlns:android). Layout attributes may not resolve.",
          severity: "warning",
        });
      }
    }

    // Simple lint parser rule for Kotlin
    if (activeTab.language === "kotlin") {
      const code = activeTab.content;
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        newDiagnostics.push({
          line: code.split("\n").length || 1,
          message: "Syntax Error: Unbalanced curly braces. Check matching '{}'.",
          severity: "error",
        });
      }
      if (code.includes("Toast") && !code.includes(".show()")) {
        // Find line containing Toast
        const lines = code.split("\n");
        const idx = lines.findIndex((l) => l.includes("Toast") && !l.includes(".show()"));
        if (idx !== -1) {
          newDiagnostics.push({
            line: idx + 1,
            message: "Lint Warning: Toast created but '.show()' was not invoked. It will never be displayed.",
            severity: "warning",
          });
        }
      }
    }

    setDiagnostics(newDiagnostics);
  }, [activeTabId, openTabs]);

  // Recursively find file helper
  const findFileByPath = (node: FileNode, path: string): FileNode | null => {
    if (node.path === path) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findFileByPath(child, path);
        if (found) return found;
      }
    }
    return null;
  };

  const handleEmitLog = (tag: string, message: string, level: "V" | "D" | "I" | "W" | "E" = "I") => {
    const now = new Date();
    const ts = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const log: LogLine = {
      id: Date.now().toString() + Math.random().toString(),
      timestamp: ts,
      level,
      tag,
      message,
    };
    setLogs((prev) => [...prev, log]);
  };

  // Callback to add/select ADB devices
  const handleAddAdbDevice = (dev: ADBDevice) => {
    setAdbDevices((prev) => [...prev, dev]);
    setSelectedAdbDevice(dev.id);
  };

  const handleFileSelect = (path: string) => {
    const fileNode = findFileByPath(projectTree, path);
    if (!fileNode || fileNode.type !== "file") return;

    // Check if tab is already open
    const isTabOpen = openTabs.some((t) => t.path === path);
    if (isTabOpen) {
      setActiveTabId(path);
    } else {
      const langMap: Record<string, "kotlin" | "java" | "xml" | "gradle" | "json" | "markdown"> = {
        kt: "kotlin",
        java: "java",
        xml: "xml",
        gradle: "gradle",
        json: "json",
        md: "markdown",
      };
      const ext = path.split(".").pop() || "";
      const lang = langMap[ext] || "kotlin";

      const newTab: EditorTab = {
        path: fileNode.path,
        name: fileNode.name,
        content: fileNode.content || "",
        isDirty: false,
        language: lang,
      };
      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabId(path);
    }
  };

  const handleTabClose = (path: string) => {
    const remaining = openTabs.filter((t) => t.path !== path);
    setOpenTabs(remaining);
    if (activeTabId === path) {
      setActiveTabId(remaining.length > 0 ? remaining[0].path : null);
    }
  };

  const handleContentChange = (path: string, newContent: string) => {
    setOpenTabs((prev) =>
      prev.map((t) => (t.path === path ? { ...t, content: newContent, isDirty: true } : t))
    );
    // Sync into main tree
    setProjectTree((prevTree) => {
      const updatedTree = { ...prevTree };
      const file = findFileByPath(updatedTree, path);
      if (file) {
        file.content = newContent;
      }
      return updatedTree;
    });
  };

  const handleCreateFile = (parentPath: string, name: string, isDir: boolean) => {
    setProjectTree((prevTree) => {
      const updatedTree = { ...prevTree };
      const parent = findFileByPath(updatedTree, parentPath);
      if (parent && parent.children) {
        const fullPath = parentPath ? `${parentPath}/${name}` : name;
        parent.children.push({
          name,
          path: fullPath,
          type: isDir ? "directory" : "file",
          children: isDir ? [] : undefined,
          content: isDir ? undefined : "",
        });
      }
      return updatedTree;
    });
    handleEmitLog("IDE", `Created ${isDir ? "directory" : "file"}: ${name} at /${parentPath}`, "I");
  };

  const handleDeleteFile = (path: string) => {
    setProjectTree((prevTree) => {
      const updatedTree = { ...prevTree };
      const parts = path.split("/");
      const fileName = parts.pop() || "";
      const parentPath = parts.join("/");
      const parent = findFileByPath(updatedTree, parentPath);
      if (parent && parent.children) {
        parent.children = parent.children.filter((c) => c.name !== fileName);
      }
      return updatedTree;
    });

    handleTabClose(path);
    handleEmitLog("IDE", `Deleted item at path: /${path}`, "W");
  };

  // Compile APK build Pipeline via GitHub Actions
  const handleTriggerBuild = async () => {
    if (!githubToken.trim()) {
      handleEmitLog("Build", "GitHub Token missing. Please provide a PAT in the GitHub tab to use Cloud Build.", "E");
      setBuildOutput([
        "ERROR: GitHub Token is required to execute real cloud builds.",
        "Please open the GitHub tab in the sidebar and enter your Personal Access Token."
      ]);
      return;
    }

    setBuildOutput(["Starting Cloud Build via GitHub Actions..."]);
    handleEmitLog("Build", "Initializing Cloud Build process...", "I");

    let currentProjectTree = projectTree;
    let attempt = 1;
    const maxAttempts = autoRepairMode ? 5 : 1;

    const appendBuildLog = (msg: string) => {
      setBuildOutput((prev) => [...prev, msg]);
    };

    while (attempt <= maxAttempts) {
      try {
        appendBuildLog(`=== Build Attempt ${attempt}/${maxAttempts} ===`);
        appendBuildLog("Authenticating with GitHub...");
        const repoName = "e4d-generated-app";
        const repoData = await createOrGetRepo(githubToken, repoName);
        const owner = repoData.owner.login;
        const repo = repoData.name;

        appendBuildLog("Pushing project files to GitHub...");
        await pushFilesToRepo(githubToken, owner, repo, currentProjectTree, appendBuildLog);

        appendBuildLog("Files pushed successfully. Waiting for CI/CD...");
        const result = await pollWorkflowRun(githubToken, owner, repo, appendBuildLog) as { runId: string } | undefined;

        appendBuildLog("Retrieving APK download link...");
        const downloadUrl = await getArtifactDownloadUrl(githubToken, owner, repo);
        
        setApkDownloadUrl(downloadUrl);
        appendBuildLog(" ");
        appendBuildLog("BUILD SUCCESSFUL. APK is ready for download.");
        handleEmitLog("Build", "Cloud build completed successfully. APK is ready.", "I");
        break; // Success!

      } catch (error: any) {
        setBuildOutput((prev) => [...prev, " ", `BUILD FAILED: ${error.message}`]);
        handleEmitLog("Build", `Cloud build failed: ${error.message}`, "E");

        if (autoRepairMode && attempt < maxAttempts && error.runId) {
          appendBuildLog(" ");
          appendBuildLog(`[Auto-Repair] Fetching failure logs for run #${error.runId}...`);
          handleEmitLog("Build", "Fetching failure logs for AI Auto-Repair...", "I");
          
          try {
            const owner = (await fetchGitHubUser(githubToken)).login;
            const failedLogs = await getFailedJobLog(githubToken, owner, "e4d-generated-app", error.runId);
            
            appendBuildLog("[Auto-Repair] Requesting AI to diagnose and repair...");
            const repairRes = await fetch("/api/repair", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                logs: failedLogs,
                projectTree: currentProjectTree,
                knowledgeBase
              })
            });
            const repairData = await repairRes.json();
            
            if (repairData.filesToUpdate && repairData.filesToUpdate.length > 0) {
              appendBuildLog(`[Auto-Repair] AI proposes fixes for ${repairData.filesToUpdate.length} file(s).`);
              if (repairData.learnedRule) {
                appendBuildLog(`[Auto-Repair] Learned: ${repairData.learnedRule}`);
                setKnowledgeBase(prev => [...prev, repairData.learnedRule]);
              }

              // Apply fixes to local state
              let newTree = { ...currentProjectTree };
              for (const update of repairData.filesToUpdate) {
                appendBuildLog(`[Auto-Repair] Patching ${update.path}...`);
                // Find and update file in tree (simplified)
                const parts = update.path.split("/");
                const fileName = parts.pop() || "";
                const parentPath = parts.join("/");
                const parent = findFileByPath(newTree, parentPath);
                if (parent && parent.children) {
                  const file = parent.children.find(c => c.name === fileName);
                  if (file) {
                    file.content = update.newContent;
                    // Sync open tab if it's open
                    setOpenTabs(tabs => tabs.map(t => t.path === update.path ? { ...t, content: update.newContent } : t));
                  }
                }
              }
              currentProjectTree = newTree;
              setProjectTree(newTree);
              appendBuildLog("[Auto-Repair] Patches applied. Retrying build...");
              attempt++;
            } else {
              appendBuildLog("[Auto-Repair] AI could not determine a fix.");
              break;
            }
          } catch (repairErr: any) {
            appendBuildLog(`[Auto-Repair] AI Repair failed: ${repairErr.message}`);
            break;
          }
        } else {
          break; // Stop if not auto-repairing or reached max attempts
        }
      }
    }
  };

  // Gradle Sync Action
  const handleTriggerSync = () => {
    setBuildOutput([
      "Starting Gradle Daemon...",
      "Gradle Daemon started successfully.",
      "> Syncing Everything4DroidApp with Gradle config...",
      "Resolving dependency tree dependencies...",
    ]);
    setTimeout(() => {
      setBuildOutput((prev) => [
        ...prev,
        ...dependencies.map((dep) => `  Downloaded ${dep.group}:${dep.name}:${dep.version}`),
        "Applying android and kotlin plugins...",
        "Sync completed successfully. Android SDK platform-34 loaded.",
        "",
        "GRADLE SYNC SUCCESSFUL in 1.2s",
      ]);
      handleEmitLog("Gradle", "Sync completed. Loaded dependency definitions successfully.", "I");
    }, 1000);
  };

  // Add Dependency helper
  const handleAddDependency = (newDep: Omit<GradleDependency, "id">) => {
    const dep: GradleDependency = {
      ...newDep,
      id: Date.now().toString(),
    };
    setDependencies((prev) => [...prev, dep]);
    handleEmitLog("Gradle", `Injected dependency into build.gradle: ${dep.group}:${dep.name}:${dep.version}`, "I");
  };

  const handleRemoveDependency = (id: string) => {
    setDependencies((prev) => prev.filter((d) => d.id !== id));
    handleEmitLog("Gradle", "Removed dependency config.", "W");
  };

  const handleDownloadApk = () => {
    if (apkDownloadUrl) {
      handleEmitLog("Export", "Downloading signed release APK package from Cloud...", "I");
      window.open(apkDownloadUrl, "_blank");
    } else {
      // Fallback for signing simulation
      handleEmitLog("Export", "Downloading signed release APK package...", "I");
      const link = document.createElement("a");
      link.href = "#";
      link.download = "Everything4DroidApp-release-signed.apk";
      link.click();
    }
  };

  // Dynamic documentation & README generators
  const handleGenerateReadme = async (repoUrl: string) => {
    handleEmitLog("GitHub", "AI Auto README generation requested...", "I");
    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Write a beautiful, comprehensive, highly professional README.md markdown file for this Android project: ${repoUrl}. Include features list, layout design specifications, and Gradle configurations. Output only the README content inside markdown blocks.`,
          systemInstruction: "You are an expert technical writer and Android developer helper.",
        }),
      });

      const data = await response.json();
      if (response.ok && data.text) {
        // Detect markdown block and open in new tab
        const codeBlockRegex = /```(?:markdown)?\n([\s\S]*?)```/i;
        const match = data.text.match(codeBlockRegex);
        const readmeContent = match && match[1] ? match[1] : data.text;

        // Create new README tab
        const newTab: EditorTab = {
          path: "README.md",
          name: "README.md",
          content: readmeContent,
          isDirty: false,
          language: "markdown",
        };
        setOpenTabs((prev) => [...prev, newTab]);
        setActiveTabId("README.md");
        handleEmitLog("GitHub", "README.md generated successfully and loaded in editor.", "I");
      }
    } catch (err: any) {
      handleEmitLog("GitHub", `Readme generator failed: ${err.message}`, "E");
    }
  };

  const handleGenerateDesc = async (repoUrl: string) => {
    handleEmitLog("GitHub", "AI Auto Project Description requested...", "I");
    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Generate a concise, elegant, 1-paragraph summary/description explaining the features, tech-stack (Kotlin, Gradle, layouts), and architectural patterns of this Android project: ${repoUrl}. No code blocks, just text.`,
          systemInstruction: "You are an expert tech-writer and marketing manager.",
        }),
      });

      const data = await response.json();
      if (response.ok && data.text) {
        // Create new desc tab
        const newTab: EditorTab = {
          path: "ProjectDescription.md",
          name: "ProjectDescription.md",
          content: `# Project Description\n\n${data.text}`,
          isDirty: false,
          language: "markdown",
        };
        setOpenTabs((prev) => [...prev, newTab]);
        setActiveTabId("ProjectDescription.md");
        handleEmitLog("GitHub", "Project description compiled and opened.", "I");
      }
    } catch (err: any) {
      handleEmitLog("GitHub", `Description compiler failed: ${err.message}`, "E");
    }
  };

  const activeTabContent = openTabs.find((t) => t.path === activeTabId)?.content || "";

  return (
    <div className="flex flex-col h-screen w-full bg-[#020617] text-slate-100 overflow-hidden font-sans select-none antialiased">
      {/* Dynamic top glowing header accent */}
      <div className="h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 shadow-[0_1px_12px_rgba(16,185,129,0.3)]"></div>

      {/* Main visual header */}
      <header className="bg-slate-950 px-5 py-3 border-b border-slate-900 flex justify-between items-center z-10 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400 shadow shadow-emerald-500/5 flex items-center justify-center">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-left">
            <h1 className="text-sm font-extrabold tracking-wider text-slate-100 font-sans uppercase">
              Everything4Droid IDE
            </h1>
            <p className="text-[10px] text-slate-400 font-medium font-sans">
              Dynamic Android Browser Workspace
            </p>
          </div>
        </div>

        {/* Action Quick Headers */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/5 text-emerald-400 text-[10px] font-mono px-2.5 py-1 rounded-full border border-emerald-500/15 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></div>
            <span>DEVELOPER DESK</span>
          </div>
        </div>
      </header>

      {/* Primary Bento Layout Body splits */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4 bg-[#030712] relative select-none">
        {/* Left column: Sidebar Project Explorer & Syncer (Grid 3/12 span) */}
        <section className="w-80 flex flex-col shrink-0 select-none h-full">
          <Sidebar
            projectTree={projectTree}
            activeTab={openTabs.find((t) => t.path === activeTabId) || null}
            onFileSelect={handleFileSelect}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            adbDevices={adbDevices}
            onAddAdbDevice={handleAddAdbDevice}
            onSelectAdbDevice={setSelectedAdbDevice}
            selectedAdbDevice={selectedAdbDevice}
            onLogcatEmit={(tag, msg, lvl) => handleEmitLog(tag, msg, lvl)}
            onGenerateReadme={handleGenerateReadme}
            onGenerateDesc={handleGenerateDesc}
            githubToken={githubToken}
            onSetGithubToken={setGithubToken}
          />
        </section>

        {/* Center column: Main editor workspace + Bottom diagnostic console (flexible layout) */}
        <section className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
          {/* Top layout: code editor */}
          <div className="flex-1 overflow-hidden">
            <EditorArea
              openTabs={openTabs}
              activeTabId={activeTabId}
              onTabSelect={setActiveTabId}
              onTabClose={handleTabClose}
              onContentChange={handleContentChange}
              diagnostics={diagnostics}
              onTriggerRun={() => setIsEmulatorRunning(true)}
              onTriggerBuild={handleTriggerBuild}
              onTriggerSync={handleTriggerSync}
            />
          </div>

          {/* Bottom layout: system diagnostic output terminal consoles */}
          <div className="h-64 shrink-0 overflow-hidden">
            <BottomConsole
              logs={logs}
              onClearLogs={() => setLogs([])}
              buildOutput={buildOutput}
              dependencies={dependencies}
              onAddDependency={handleAddDependency}
              onRemoveDependency={handleRemoveDependency}
              onTriggerSync={handleTriggerSync}
              onDownloadApk={handleDownloadApk}
              hasRealApk={!!apkDownloadUrl}
              autoRepairMode={autoRepairMode}
              onToggleAutoRepair={setAutoRepairMode}
              knowledgeBase={knowledgeBase}
              setKnowledgeBase={setKnowledgeBase}
            />
          </div>
        </section>

        {/* Right column: Interactive phone frame emulator (and optionally AI Copilot) */}
        <section className="w-[300px] flex flex-col gap-4 shrink-0 overflow-y-auto select-none h-full">
          {/* Active Virtual Device Emulator Frame */}
          <div className="flex-1 min-h-[350px]">
            <DeviceEmulator
              xmlContent={activeTabId && activeTabId.endsWith(".xml") ? activeTabContent : initialProjectTree.children?.[0].children?.[1].children?.[0].children?.[0].content || ""}
              onLogcatEmit={(log) => handleEmitLog(log.tag, log.message, log.level)}
              isRunning={isEmulatorRunning}
              setIsRunning={setIsEmulatorRunning}
            />
          </div>

          {/* AI Coding Copilot Panel */}
          <div className="h-72 shrink-0">
            <CopilotPanel
              activeTab={openTabs.find((t) => t.path === activeTabId) || null}
              onApplyCode={(newCode) => {
                if (activeTabId) {
                  handleContentChange(activeTabId, newCode);
                }
              }}
              onLogcatEmit={(tag, msg, lvl) => handleEmitLog(tag, msg, lvl)}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
