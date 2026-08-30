import { GoogleGenerativeAI } from "@google/generative-ai";

let hasLoggedMissingKeyWarning = false;

function getGeminiClient(): GoogleGenerativeAI | null {
  const currentKey = process.env.GEMINI_API_KEY || "";
  if (!currentKey) {
    if (!hasLoggedMissingKeyWarning) {
      console.warn(
        "[RevivePay AI] GEMINI_API_KEY is not set. Multi-agent pipeline will operate in resilient deterministic rule-based fallback mode."
      );
      hasLoggedMissingKeyWarning = true;
    }
    return null;
  }
  return new GoogleGenerativeAI(currentKey);
}

/**
 * Call Gemini with structured JSON prompt and strong fallback guarantees.
 */
export async function callGeminiStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  fallbackValue: T,
  modelName: string = "gemini-2.5-flash"
): Promise<{ result: T; usedFallback: boolean; model: string }> {
  const genAI = getGeminiClient();
  const currentKey = process.env.GEMINI_API_KEY || "";

  if (!genAI || !currentKey) {
    return {
      result: fallbackValue,
      usedFallback: true,
      model: "deterministic-rule-fallback"
    };
  }

  try {
    const startTime = Date.now();
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
    const latencyMs = Date.now() - startTime;
    console.log(`[RevivePay AI] Gemini (${modelName}) completed structured response in ${latencyMs}ms`);

    if (!text) {
      return { result: fallbackValue, usedFallback: true, model: "fallback-empty-response" };
    }

    const parsed = JSON.parse(text) as T;
    return { result: parsed, usedFallback: false, model: modelName };
  } catch (error) {
    console.warn(`[RevivePay AI] Gemini (${modelName}) call failed, employing safe deterministic fallback:`, error);
    return {
      result: fallbackValue,
      usedFallback: true,
      model: "deterministic-rule-fallback"
    };
  }
}
