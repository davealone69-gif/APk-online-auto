export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
}

export interface EditorTab {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  language: "kotlin" | "java" | "xml" | "gradle" | "json" | "markdown";
}

export interface Diagnostic {
  line: number;
  message: string;
  severity: "error" | "warning";
  column?: number;
}

export interface ADBDevice {
  id: string;
  name: string;
  type: "emulator" | "physical";
  status: "online" | "offline" | "unauthorized";
  ipAddress?: string;
}

export interface LogLine {
  id: string;
  timestamp: string;
  level: "V" | "D" | "I" | "W" | "E";
  tag: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface GradleDependency {
  id: string;
  group: string;
  name: string;
  version: string;
  scope: "implementation" | "api" | "testImplementation" | "androidTestImplementation";
}

export interface AndroidLayoutElement {
  type: string;
  id?: string;
  text?: string;
  width?: string;
  height?: string;
  background?: string;
  textColor?: string;
  padding?: string;
  margin?: string;
  children?: AndroidLayoutElement[];
}
