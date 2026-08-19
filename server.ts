import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// AI Coding Copilot endpoint
app.post("/api/copilot", async (req, res) => {
  try {
    const { prompt, systemInstruction, model = "gemini-3.5-flash", temperature = 0.2 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      // Graceful error if API key is not configured yet
      return res.json({
        text: "## API Key Missing\n\nI can see you're trying to use the AI Copilot. To enable AI features, please configure your **GEMINI_API_KEY** in the **Settings > Secrets** panel in AI Studio. Once configured, I will be fully functional to generate, refactor, and debug Android code!",
      });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are an expert Android developer and AI Coding Copilot for Everything4Droid IDE.",
        temperature: temperature,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// GitHub mock/assisted endpoints for OAuth and sync
app.post("/api/github/analyze", async (req, res) => {
  try {
    const { repoUrl, files } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: "Repository URL is required" });
    }

    // Call Gemini to analyze the repository structure and content
    const prompt = `Analyze this simulated Android repository: ${repoUrl}.
Files present: ${JSON.stringify(files || [])}

Provide a structured, highly professional analysis in JSON format with:
- "detectedType": "Kotlin DSL" or "Groovy Gradle"
- "packageName": detected package name (e.g. com.example.app)
- "minSdkVersion": detected or typical SDK version
- "targetSdkVersion": typical SDK version
- "components": list of main components (Activities, Services, etc.)
- "suggestions": list of 3 project improvement suggestions or dependencies to add`;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      return res.json({
        analysis: {
          detectedType: "Kotlin DSL",
          packageName: "com.everything4droid.app",
          minSdkVersion: 26,
          targetSdkVersion: 34,
          components: ["MainActivity (Kotlin)", "MainViewModel", "activity_main.xml"],
          suggestions: [
            "Add Jetpack Compose for modern declarative UI.",
            "Integrate Hilt for dependency injection.",
            "Update Android Gradle Plugin (AGP) to latest stable version."
          ]
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    res.json({ analysis: result });
  } catch (error: any) {
    console.error("Repo analysis error:", error);
    res.status(500).json({ error: error?.message || "Failed to analyze repository" });
  }
});

// Auto-Repair AI endpoint
app.post("/api/repair", async (req, res) => {
  try {
    const { logs, projectTree, knowledgeBase } = req.body;
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ error: "Gemini API Key missing for auto-repair." });
    }

    const prompt = `
You are an expert Android Build System engineer. A GitHub Actions Gradle build just failed.
Here is the raw error log:
---
${logs}
---

Here is the current state of the project files (flattened):
---
${JSON.stringify(projectTree, null, 2)}
---

Here are previously learned rules and manual user build instructions (Knowledge Base).
You MUST follow these rules when resolving the failure:
---
${JSON.stringify(knowledgeBase || [])}
---

Your task: Fix the build error.
Return a JSON object matching this schema:
{
  "filesToUpdate": [
    { "path": "app/build.gradle.kts", "newContent": "..." }
  ],
  "learnedRule": "A concise, 1-sentence rule to prevent this specific error in the future."
}

Ensure the newContent is the FULL, updated file content, not just a patch.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error("Auto-repair error:", error);
    res.status(500).json({ error: error?.message || "Failed to generate repair." });
  }
});

// Start server
async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
