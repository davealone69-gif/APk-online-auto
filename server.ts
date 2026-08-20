import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { Ollama } from "ollama";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
app.use(express.json());

const ollama = new Ollama();

// AI Coding Copilot endpoint
app.post("/api/copilot", async (req, res) => {
  try {
    const { prompt, systemInstruction, model = "llama3.2", temperature = 0.2 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const response = await ollama.chat({
      model: model,
      messages: [
        { role: "system", content: systemInstruction || "You are an expert Android developer and AI Coding Copilot for Everything4Droid IDE." },
        { role: "user", content: prompt }
      ],
      options: {
        temperature: temperature,
      }
    });

    res.json({ text: response.message.content });
  } catch (error: any) {
    console.error("Ollama API error:", error);
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

    // Call Ollama to analyze the repository structure and content
    const prompt = `Analyze this simulated Android repository: ${repoUrl}.
Files present: ${JSON.stringify(files || [])}
Provide a structured, highly professional analysis in JSON format with:
- "detectedType": "Kotlin DSL" or "Groovy Gradle"
- "packageName": detected package name (e.g. com.example.app)
- "minSdkVersion": detected or typical SDK version
- "targetSdkVersion": typical SDK version
- "components": list of main components (Activities, Services, etc.)
- "suggestions": list of 3 project improvement suggestions or dependencies to add`;

    const response = await ollama.chat({
      model: "llama3.2",
      messages: [{ role: "user", content: prompt }],
      format: "json",
    });

    const result = JSON.parse(response.message.content || "{}");
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

    const response = await ollama.chat({
      model: "llama3.2",
      messages: [{ role: "user", content: prompt }],
      format: "json",
      options: {
        temperature: 0.1,
      }
    });

    const result = JSON.parse(response.message.content || "{}");
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
