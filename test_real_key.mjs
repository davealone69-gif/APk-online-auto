import { GoogleGenAI } from "@google/genai";
import fs from "fs";

async function run() {
  const token = process.env.GEMINI_API_KEY;
  console.log("Token length:", token ? token.length : 0);
  
  const ai = new GoogleGenAI({ apiKey: token });
  try {
    await ai.models.generateContent({ model: "gemini-3.5-flash", contents: "hi" });
    console.log("Success!");
  } catch (e) {
    console.log("Error JSON:", JSON.stringify(e, null, 2));
    console.log("Error details:", JSON.stringify(e.details, null, 2));
  }
}
run();
