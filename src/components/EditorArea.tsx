import { useState, useEffect } from "react";
import { Play, FileText, Search, RefreshCw, Layers, CheckSquare, Sparkles, AlertCircle } from "lucide-react";
import { EditorTab, Diagnostic } from "../types";
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { java } from '@codemirror/lang-java';
import { xml } from '@codemirror/lang-xml';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';

interface EditorAreaProps {
  openTabs: EditorTab[];
  activeTabId: string | null;
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
  onContentChange: (path: string, content: string) => void;
  diagnostics: Diagnostic[];
  onTriggerRun: () => void;
  onTriggerBuild: () => void;
  onTriggerSync: () => void;
}

export default function EditorArea({
  openTabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onContentChange,
  diagnostics,
  onTriggerRun,
  onTriggerBuild,
  onTriggerSync,
}: EditorAreaProps) {
  const activeTab = openTabs.find((t) => t.path === activeTabId) || null;

  // Search & Replace states
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");

  // Editor View Mode
  // For XML, support Code-Only, Design-Only, or Split view
  const [editorMode, setEditorMode] = useState<"code" | "design" | "split">("split");

  // Manifest Permission Checks
  const [permissions, setPermissions] = useState({
    internet: true,
    camera: true,
    location: false,
    storage: false,
  });

  // Handle manifest visual checklist state from XML string
  useEffect(() => {
    if (activeTab && activeTab.name === "AndroidManifest.xml") {
      setPermissions({
        internet: activeTab.content.includes("android.permission.INTERNET"),
        camera: activeTab.content.includes("android.permission.CAMERA"),
        location: activeTab.content.includes("android.permission.ACCESS_FINE_LOCATION"),
        storage: activeTab.content.includes("android.permission.WRITE_EXTERNAL_STORAGE"),
      });
    }
  }, [activeTabId, activeTab?.content]);

  const handlePermissionToggle = (permissionKey: keyof typeof permissions) => {
    if (!activeTab || activeTab.name !== "AndroidManifest.xml") return;

    const updatedPerms = { ...permissions, [permissionKey]: !permissions[permissionKey] };
    setPermissions(updatedPerms);

    // Reconstruct Manifest XML based on checkboxes
    let baseXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.droidapp">\n\n`;

    if (updatedPerms.internet) {
      baseXml += `    <uses-permission android:name="android.permission.INTERNET" />\n`;
    }
    if (updatedPerms.camera) {
      baseXml += `    <uses-permission android:name="android.permission.CAMERA" />\n`;
    }
    if (updatedPerms.location) {
      baseXml += `    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n`;
    }
    if (updatedPerms.storage) {
      baseXml += `    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />\n`;
    }

    baseXml += `\n    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Everything4DroidApp">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`;

    onContentChange(activeTab.path, baseXml);
  };

  const handleSearchReplace = () => {
    if (!activeTab || !searchTerm) return;
    const re = new RegExp(searchTerm, "g");
    const updatedContent = activeTab.content.replace(re, replaceTerm);
    onContentChange(activeTab.path, updatedContent);
  };

  if (!activeTab) {
    return (
      <div id="editor-empty" className="bg-slate-950 border border-slate-800 rounded-xl flex flex-col items-center justify-center h-full text-center p-6 shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#090d16_0%,transparent_100%)]"></div>
        <FileText className="w-16 h-16 text-slate-700 mb-4 z-10" />
        <h3 className="text-base font-bold text-slate-300 font-sans tracking-wide z-10">No Files Open</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm z-10">
          Browse the Project Explorer sidebar and select a source file to edit, compile, or analyze with our AI.
        </p>
      </div>
    );
  }

  const isXml = activeTab.language === "xml";
  const isManifest = activeTab.name === "AndroidManifest.xml";

  return (
    <div id="editor-area" className="bg-slate-950 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden shadow-inner relative">
      {/* Top Tabs Bar */}
      <div className="bg-slate-900 border-b border-slate-800 flex justify-between items-center px-2 z-10 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none py-1.5 max-w-[70%]">
          {openTabs.map((tab) => (
            <div
              id={`tab-${tab.path.replace(/\//g, "-")}`}
              key={tab.path}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                tab.path === activeTabId
                  ? "bg-slate-950 text-emerald-400 border border-slate-800/80"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <span onClick={() => onTabSelect(tab.path)} className="font-sans">
                {tab.name}
              </span>
              <button
                onClick={() => onTabClose(tab.path)}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-all cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Toolbar Build Controls */}
        <div className="flex items-center gap-2 pr-1.5">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
            title="Search & Replace"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onTriggerSync}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-[10px] py-1 px-2 rounded border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" /> Gradle Sync
          </button>
          <button
            onClick={onTriggerBuild}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-[10px] py-1 px-2 rounded border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Layers className="w-3 h-3 text-amber-400" /> Build APK
          </button>
          <button
            onClick={onTriggerRun}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] py-1 px-2.5 rounded transition-colors cursor-pointer flex items-center gap-1 shadow shadow-emerald-500/10"
          >
            <Play className="w-3 h-3 fill-current" /> Run
          </button>
        </div>
      </div>

      {/* Search and Replace bar */}
      {showSearch && (
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex flex-wrap gap-2 items-center z-10 shrink-0">
          <input
            type="text"
            placeholder="Search pattern"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded text-[11px] px-2.5 py-1 text-slate-300 outline-none w-36 focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="Replace with"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded text-[11px] px-2.5 py-1 text-slate-300 outline-none w-36 focus:border-emerald-500"
          />
          <button
            onClick={handleSearchReplace}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] py-1 px-3 rounded cursor-pointer border border-slate-700 font-sans font-semibold"
          >
            Replace All
          </button>
        </div>
      )}

      {/* Editor Main Content & Splits */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Visual Manifest Designer Panel */}
        {isManifest && (
          <div className="w-full md:w-60 bg-slate-900/40 border-r border-slate-850 p-4 space-y-4 text-left shrink-0 overflow-y-auto">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800/80">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold font-sans text-slate-300">Visual Manifest Editor</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Toggle permission requirements in your Android App below. The manifest will update instantly.
            </p>

            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={permissions.internet}
                  onChange={() => handlePermissionToggle("internet")}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                />
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-300">Internet Access</p>
                  <p className="text-[9px] text-slate-500 font-mono">android.permission.INTERNET</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={permissions.camera}
                  onChange={() => handlePermissionToggle("camera")}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                />
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-300">Camera Permission</p>
                  <p className="text-[9px] text-slate-500 font-mono">android.permission.CAMERA</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={permissions.location}
                  onChange={() => handlePermissionToggle("location")}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                />
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-300">Fine Location</p>
                  <p className="text-[9px] text-slate-500 font-mono">ACCESS_FINE_LOCATION</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={permissions.storage}
                  onChange={() => handlePermissionToggle("storage")}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                />
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-300">Storage Read/Write</p>
                  <p className="text-[9px] text-slate-500 font-mono">WRITE_EXTERNAL_STORAGE</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Dynamic Layout Designer Controls for Layout XMLs */}
        {isXml && (
          <div className="absolute top-2 right-4 z-20 bg-slate-900 border border-slate-800 rounded-md p-1.5 flex gap-1.5 shadow-lg">
            <button
              onClick={() => setEditorMode("code")}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                editorMode === "code" ? "bg-slate-850 text-emerald-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Code Only
            </button>
            <button
              onClick={() => setEditorMode("split")}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                editorMode === "split" ? "bg-slate-850 text-emerald-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Split View
            </button>
          </div>
        )}

        {/* Text Code Editor Panel */}
        {(editorMode === "code" || editorMode === "split" || !isXml) && (
          <div className="flex-1 flex overflow-hidden bg-[#1e1e1e]">
            <CodeMirror
              value={activeTab.content}
              height="100%"
              theme={vscodeDark}
              extensions={[
                activeTab.language === "xml" ? xml() :
                activeTab.language === "json" ? json() :
                activeTab.language === "markdown" ? markdown() :
                java()
              ]}
              onChange={(value) => onContentChange(activeTab.path, value)}
              className="h-full w-full text-xs flex-1"
            />
          </div>
        )}

        {/* Layout Designer Visual XML Renderer */}
        {isXml && (editorMode === "split") && (
          <div className="flex-1 bg-slate-900/40 border-l border-slate-800/85 flex flex-col p-4 overflow-y-auto select-none">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold tracking-wider text-slate-400 font-sans uppercase">
                Real-Time Resource Previewer
              </span>
            </div>

            {/* Simulated Live Frame */}
            <div className="border border-slate-800 bg-slate-950 rounded-xl p-6 min-h-[300px] flex flex-col items-center justify-start text-center">
              <p className="text-slate-300 font-semibold text-xs tracking-wider mb-2">Live XML Layout</p>
              <p className="text-[10px] text-slate-500 mb-6 font-mono">activity_main.xml</p>

              <div className="w-full max-w-[200px] bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center gap-3">
                <div className="w-10 h-10 bg-slate-800/60 rounded-full border border-emerald-500/20 p-2 text-emerald-400 flex items-center justify-center animate-bounce">
                  Android
                </div>
                <div className="text-xs font-bold text-slate-200">Layout Preview Loaded</div>
                <div className="text-[9px] text-slate-400 leading-normal">
                  Your widgets are compiled on-the-fly and parsed into interactive nodes inside the emulator.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Diagnostic Warning Alert bar if there's syntax diagnostics */}
      {diagnostics.length > 0 && (
        <div className="bg-rose-500/10 border-t border-rose-500/20 px-4 py-2 flex items-center gap-2 text-rose-400 text-xs text-left shrink-0 font-sans z-10 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <div className="flex-1">
            <strong>Line {diagnostics[0].line}:</strong> {diagnostics[0].message}
          </div>
        </div>
      )}
    </div>
  );
}
