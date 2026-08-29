import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Call Gemini with structured JSON prompt and strong fallback guarantees.
 */
export async function callGeminiStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  fallbackValue: T,
  modelName: string = "gemini-1.5-pro"
): Promise<{ result: T; usedFallback: boolean; model: string }> {
  if (!genAI || !apiKey) {
    return {
      result: fallbackValue,
      usedFallback: true,
      model: "deterministic-rule-fallback"
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      },
      systemInstruction: systemPrompt
    });

    const response = await model.generateContent(userPrompt);
    const text = response.response.text();
    if (!text) {
      return { result: fallbackValue, usedFallback: true, model: "fallback-empty-response" };
    }

    const parsed = JSON.parse(text) as T;
    return { result: parsed, usedFallback: false, model: modelName };
  } catch (error) {
    console.warn("Gemini call failed, employing safe deterministic fallback:", error);
    return {
      result: fallbackValue,
      usedFallback: true,
      model: "deterministic-rule-fallback"
    };
  }
}
