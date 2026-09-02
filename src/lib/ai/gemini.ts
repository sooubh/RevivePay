import { GoogleGenerativeAI } from "@google/generative-ai";

let cachedClient: GoogleGenerativeAI | null = null;
let cachedApiKey = "";
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
  if (!cachedClient || cachedApiKey !== currentKey) {
    cachedApiKey = currentKey;
    cachedClient = new GoogleGenerativeAI(currentKey);
  }
  return cachedClient;
}

/**
 * Extracts and cleans JSON string from LLM responses (stripping markdown fences & commentary)
 */
function extractJsonString(rawText: string): string {
  if (!rawText) return "";
  let text = rawText.trim();
  // Strip markdown code fences (```json ... ``` or ``` ...)
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // If wrapped with prefix/suffix commentary, locate outer brackets
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return text.substring(firstBracket, lastBracket + 1);
  }
  return text;
}

/**
 * Call Gemini with structured JSON prompt, automatic timeout, model cascade, and strong fallback guarantees.
 */
export async function callGeminiStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  fallbackValue: T,
  preferredModelName?: string
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

  // Model fallback cascade: Environment variable -> Preferred parameter -> Standard Flash
  const primaryModel = process.env.GEMINI_MODEL || preferredModelName || "gemini-1.5-flash";
  const fallbackModel = "gemini-1.5-flash";
  const modelsToTry = primaryModel === fallbackModel ? [primaryModel] : [primaryModel, fallbackModel];

  for (const modelName of modelsToTry) {
    try {
      const startTime = Date.now();
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.15
        },
        systemInstruction: systemPrompt
      });

      // 7.5s strict timeout to prevent webhook or checkout latency spikes
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after 7500ms for ${modelName}`)), 7500)
      );

      const generatePromise = model.generateContent(userPrompt);
      const response = (await Promise.race([generatePromise, timeoutPromise])) as any;
      const rawText = response.response.text();
      const latencyMs = Date.now() - startTime;

      const cleanJson = extractJsonString(rawText);
      if (!cleanJson) {
        throw new Error("Empty or non-extractable JSON response from Gemini");
      }

      const parsed = JSON.parse(cleanJson) as T;
      console.log(`[RevivePay AI] Gemini (${modelName}) completed structured response in ${latencyMs}ms`);
      return { result: parsed, usedFallback: false, model: modelName };
    } catch (error: any) {
      console.warn(`[RevivePay AI] Gemini model (${modelName}) attempt failed: ${error?.message || error}`);
    }
  }

  // Ultimate fallback to domain-specific deterministic heuristics
  return {
    result: fallbackValue,
    usedFallback: true,
    model: "deterministic-rule-fallback"
  };
}
