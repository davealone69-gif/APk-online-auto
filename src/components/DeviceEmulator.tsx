import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCw, RefreshCw, Power, Smartphone, Volume2, ArrowLeft, Circle, Square } from "lucide-react";
import { AndroidLayoutElement, LogLine } from "../types";
import { parseAndroidLayoutXML, resolveAndroidColor } from "../utils/xmlParser";

interface DeviceEmulatorProps {
  xmlContent: string;
  onLogcatEmit: (log: Omit<LogLine, "id" | "timestamp">) => void;
  isRunning: boolean;
  setIsRunning: (run: boolean) => void;
}

export default function DeviceEmulator({
  xmlContent,
  onLogcatEmit,
  isRunning,
  setIsRunning,
}: DeviceEmulatorProps) {
  const [isLandscape, setIsLandscape] = useState(false);
  const [parsedLayout, setParsedLayout] = useState<AndroidLayoutElement | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [devName, setDevName] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [isScreenOn, setIsScreenOn] = useState(true);
  const [systemTime, setSystemTime] = useState("");

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse layout whenever xmlContent changes
  useEffect(() => {
    const parsed = parseAndroidLayoutXML(xmlContent);
    setParsedLayout(parsed);
  }, [xmlContent]);

  // Update dynamic clock in the emulator's status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    onLogcatEmit({
      level: "I",
      tag: "Toast",
      message: `Toast shown: "${msg}"`,
    });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 280000 / 100); // ~2.8s toast duration
  };

  const handleRunApp = () => {
    setBooting(true);
    setIsRunning(false);
    onLogcatEmit({
      level: "I",
      tag: "ADB",
      message: "adb push /app/build/outputs/apk/debug/app-debug.apk /data/local/tmp/",
    });
    onLogcatEmit({
      level: "I",
      tag: "PackageManager",
      message: "pkg: /data/local/tmp/app-debug.apk - success!",
    });
    onLogcatEmit({
      level: "I",
      tag: "ActivityManager",
      message: "Starting: Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] cmp=com.example.droidapp/.MainActivity }",
    });

    setTimeout(() => {
      setBooting(false);
      setIsRunning(true);
      setClickCount(0);
      onLogcatEmit({
        level: "D",
        tag: "MainActivity",
        message: "onCreate() called. Layout inflated successfully.",
      });
      triggerToast("App launched successfully!");
    }, 1500);
  };

  const handleButtonClick = (btnType: "click" | "reset" | string) => {
    if (!isRunning) return;

    if (btnType === "clickButton" || btnType.toLowerCase().includes("click") || btnType.toLowerCase().includes("increment")) {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      const logMsg = devName
        ? `MainActivity: Button clicked. Count = ${newCount}. Developer: ${devName}`
        : `MainActivity: Button clicked. Count = ${newCount}`;

      onLogcatEmit({
        level: "I",
        tag: "MainActivity",
        message: logMsg,
      });

      triggerToast(`Counter Incremented: ${newCount}`);
    } else if (btnType === "resetButton" || btnType.toLowerCase().includes("reset")) {
      setClickCount(0);
      onLogcatEmit({
        level: "I",
        tag: "MainActivity",
        message: "MainActivity: Reset button clicked. Counter cleared.",
      });
      triggerToast("Counter reset");
    } else {
      onLogcatEmit({
        level: "D",
        tag: "View",
        message: `Custom button [${btnType}] pressed.`,
      });
      triggerToast(`Pressed: ${btnType}`);
    }
  };

  const renderAndroidWidget = (element: AndroidLayoutElement) => {
    const { type, id, text, children } = element;

    const marginStyle = "mb-4";
    const paddingStyle = "p-3";

    if (type === "LinearLayout") {
      return (
        <div
          id={id || "linear_layout"}
          className="w-full h-full flex flex-col items-center justify-start text-slate-100 overflow-y-auto"
          style={{
            backgroundColor: resolveAndroidColor(element.background, "#1E293B"),
            padding: element.padding ? "20px" : "16px",
          }}
        >
          {children && children.map((child, i) => (
            <React.Fragment key={i}>{renderAndroidWidget(child)}</React.Fragment>
          ))}
        </div>
      );
    }

    if (type === "ImageView") {
      return (
        <div
          id={id || "image_view"}
          className={`flex items-center justify-center bg-slate-800/60 rounded-full border border-emerald-500/30 p-4 animate-bounce ${marginStyle}`}
          style={{ width: "70px", height: "70px" }}
        >
          <Smartphone className="w-10 h-10 text-emerald-400" />
        </div>
      );
    }

    if (type === "TextView") {
      const isHeader = id === "titleTextView";
      let renderedText = text || "TextView";
      if (id === "titleTextView") {
        renderedText = clickCount > 0 
          ? `Clicked ${clickCount} times!` 
          : text || "Welcome to Everything4Droid!";
        if (clickCount > 0 && devName) {
          renderedText = `${devName}'s Counter: ${clickCount}`;
        }
      }

      return (
        <p
          id={id || "text_view"}
          className={`text-center font-sans ${
            isHeader
              ? "text-xl font-bold text-slate-50 tracking-tight"
              : "text-xs text-slate-400"
          } ${marginStyle}`}
          style={{
            color: resolveAndroidColor(element.textColor, isHeader ? "#F8FAFC" : "#94A3B8"),
          }}
        >
          {renderedText}
        </p>
      );
    }

    if (type === "EditText") {
      return (
        <div id={id || "edit_text_wrapper"} className={`w-full ${marginStyle}`}>
          <label className="block text-[10px] text-emerald-400 font-mono mb-1">
            {id || "EditText"} Input
          </label>
          <input
            type="text"
            placeholder={text || "Enter text..."}
            value={devName}
            onChange={(e) => {
              setDevName(e.target.value);
              onLogcatEmit({
                level: "V",
                tag: "EditText",
                message: `Text changed: "${e.target.value}"`,
              });
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
          />
        </div>
      );
    }

    if (type === "Button") {
      const isReset = id === "resetButton" || text?.toLowerCase().includes("reset");
      return (
        <button
          id={id || "button_view"}
          onClick={() => handleButtonClick(id || "clickButton")}
          className={`w-full py-2.5 px-4 rounded-md text-xs font-semibold tracking-wide transition-all duration-150 transform active:scale-[0.98] cursor-pointer shadow-md shadow-black/20 ${marginStyle} ${
            isReset
              ? "bg-rose-500 hover:bg-rose-600 text-white border-b-2 border-rose-700"
              : "bg-emerald-500 hover:bg-emerald-600 text-white border-b-2 border-emerald-700"
          }`}
        >
          {text || "Button"}
        </button>
      );
    }

    // Default Widget Fallback
    return (
      <div
        id={id || "generic_view"}
        className={`w-full p-3 bg-slate-800 rounded-md border border-slate-700 text-center text-xs text-slate-300 font-mono ${marginStyle}`}
      >
        [{type}] {text || "Custom Widget"}
      </div>
    );
  };

  return (
    <div id="virtual-device-emulator" className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-between h-full shadow-inner relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

      {/* Title Header */}
      <div className="w-full flex justify-between items-center pb-3 border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-300 font-sans tracking-wide">
            Virtual Pixel 8 Pro
          </span>
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-mono">
            API 34
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLandscape(!isLandscape)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Rotate Device"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsScreenOn(!isScreenOn)}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isScreenOn ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "bg-emerald-500/20 text-emerald-400"
            }`}
            title="Toggle Screen Power"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Emulator Frame */}
      <div
        className={`my-4 transition-all duration-300 ease-in-out relative flex items-center justify-center select-none shadow-2xl shadow-black/80 border-[10px] border-slate-800 rounded-[36px] bg-slate-900 ${
          isLandscape ? "w-[440px] h-[280px]" : "w-[240px] h-[400px]"
        }`}
      >
        {/* Device Camera Punch Hole */}
        {!isLandscape && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-3.5 h-3.5 bg-black rounded-full z-30 border border-slate-800"></div>
        )}
        {isLandscape && (
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 bg-black rounded-full z-30 border border-slate-800"></div>
        )}

        {/* Screen Content */}
        <div className="w-full h-full relative overflow-hidden bg-black rounded-[26px]">
          {isScreenOn ? (
            <div className="w-full h-full flex flex-col justify-between">
              {/* Android Status Bar */}
              <div className="bg-slate-950 text-slate-400 text-[10px] px-4 py-1 flex justify-between items-center border-b border-slate-900 z-20 font-mono">
                <span>{systemTime}</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-slate-600 rounded-sm inline-block relative overflow-hidden">
                    <span className="absolute left-0 top-0 bottom-0 bg-emerald-500 w-[80%]"></span>
                  </span>
                  <span>80%</span>
                </div>
              </div>

              {/* Main Display Screen Container */}
              <div className="flex-1 w-full relative bg-slate-900 overflow-hidden">
                {booting ? (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-30">
                    <Smartphone className="w-12 h-12 text-emerald-400 animate-pulse mb-3" />
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                      <span className="text-[10px] text-slate-400 font-mono">Installing app-debug.apk...</span>
                    </div>
                  </div>
                ) : !isRunning ? (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center z-20">
                    <Smartphone className="w-12 h-12 text-slate-600 mb-3" />
                    <p className="text-xs font-semibold text-slate-300">Application not launched</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[180px]">
                      Click the "Run" button below or on the toolbar to deploy and launch.
                    </p>
                    <button
                      onClick={handleRunApp}
                      className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[10px] px-3 py-1.5 rounded-md flex items-center gap-1 transition-all shadow shadow-emerald-500/20 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" /> Run on Device
                    </button>
                  </div>
                ) : parsedLayout ? (
                  renderAndroidWidget(parsedLayout)
                ) : (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-500 text-xs">
                    No layout detected. Check activity_main.xml
                  </div>
                )}

                {/* Simulated Android Toast Notification */}
                {toastMessage && (
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800/90 text-white text-[11px] py-1.5 px-3 rounded-full border border-slate-700/80 shadow-lg text-center backdrop-blur-sm z-50 animate-fade-in max-w-[85%] truncate">
                    {toastMessage}
                  </div>
                )}
              </div>

              {/* Android Navigation Bar */}
              <div className="bg-slate-950 py-1.5 flex justify-around items-center border-t border-slate-900 z-20">
                <button
                  onClick={() => {
                    if (isRunning) {
                      setIsRunning(false);
                      onLogcatEmit({
                        level: "D",
                        tag: "Activity",
                        message: "MainActivity: Back pressed, closing app.",
                      });
                      triggerToast("App exited");
                    }
                  }}
                  className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (isRunning) {
                      setIsRunning(false);
                      onLogcatEmit({
                        level: "D",
                        tag: "Activity",
                        message: "MainActivity: Home pressed, suspending state.",
                      });
                      triggerToast("Home screen");
                    }
                  }}
                  className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <Circle className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    onLogcatEmit({
                      level: "D",
                      tag: "WindowManager",
                      message: "Recents overview triggered.",
                    });
                  }}
                  className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <Square className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <span className="text-[10px] text-slate-700 font-mono uppercase tracking-widest">
                Screen Off
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls bar */}
      <div className="w-full flex justify-between gap-3 items-center pt-3 border-t border-slate-900 z-10">
        <button
          onClick={handleRunApp}
          disabled={booting}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isRunning ? "Restart App" : "Run App"}</span>
        </button>
        <button
          onClick={() => {
            if (isRunning) {
              setIsRunning(false);
              onLogcatEmit({
                level: "I",
                tag: "ADB",
                message: "adb shell am force-stop com.example.droidapp",
              });
              triggerToast("App Stopped");
            }
          }}
          className="bg-slate-900 hover:bg-slate-800 text-rose-400 hover:text-rose-300 border border-slate-800 rounded-lg p-2 transition-colors cursor-pointer"
          title="Force Stop App"
        >
          <Power className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
