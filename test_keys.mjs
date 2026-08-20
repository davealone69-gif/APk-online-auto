import { GoogleGenAI } from "@google/genai";

const keys = [
  "null",
  "NaN",
  "false",
  "0",
  "[]",
  "{}",
  " ",
  "   ",
  "\n",
  "\t",
  "\"\"",
  "''",
  "Bearer token",
  "OAuth token"
];

for (const k of keys) {
  try {
    const ai = new GoogleGenAI({ apiKey: k });
    await ai.models.generateContent({ model: "gemini-3.5-flash", contents: "hi" });
  } catch (e) {
    if (e.message.includes("UNAUTHENTICATED")) {
      console.log("FOUND IT! Key:", JSON.stringify(k));
    }
  }
}
console.log("Done checking keys.");
