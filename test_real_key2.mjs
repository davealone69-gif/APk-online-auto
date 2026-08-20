import { GoogleGenAI } from "@google/genai";
async function run() {
  const token = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: token });
  try {
    await ai.models.generateContent({ model: "gemini-3.5-flash", contents: "hi" });
  } catch (e) {
    console.log(e.message);
  }
}
run();
