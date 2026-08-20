import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyFakeMapsKeyThatLooksValid12345" });
try {
  await ai.models.generateContent({ model: "gemini-3.5-flash", contents: "hi" });
} catch (e) {
  console.log(e.message);
}
