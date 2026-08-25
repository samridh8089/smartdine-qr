/**
 * Server-Side Google Gemini API Service for CleverOps / SmartDine
 * 
 * SECURITY NOTICE:
 * - This module MUST only be imported in server-side API routes or Server Actions.
 * - Uses process.env.GEMINI_API_KEY strictly.
 * - API Key is never sent to browser/client or logged.
 */

import { GoogleGenAI } from '@google/genai';

export const getGeminiModel = (): string => {
  return (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim();
};

export const getGeminiClient = (): GoogleGenAI => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY server environment variable is not configured.');
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates structured JSON output using Google Gemini API with model fallbacks & retry logic.
 */
export async function generateStructuredGeminiJSON<T = any>(options: {
  prompt: string;
  systemInstruction?: string;
  responseSchema?: any;
  images?: Array<{ inlineData: { mimeType: string; data: string } }>;
  temperature?: number;
}): Promise<{ success: boolean; data?: T; error?: string; rawContent?: string }> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      success: false,
      error: 'AI generation is not configured. GEMINI_API_KEY is missing on the server.'
    };
  }

  const ai = getGeminiClient();
  const modelsToTry = [
    (process.env.GEMINI_MODEL || '').trim(),
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  const contents: any[] = [];
  if (options.images && options.images.length > 0) {
    const parts: any[] = [];
    options.images.forEach(img => parts.push(img));
    parts.push({ text: options.prompt });
    contents.push({ role: 'user', parts });
  } else {
    contents.push(options.prompt);
  }

  const config: any = {
    temperature: options.temperature ?? 0.2,
    maxOutputTokens: 8192
  };

  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }

  if (options.responseSchema) {
    config.responseMimeType = 'application/json';
    config.responseSchema = options.responseSchema;
  }

  let lastError = 'Failed to generate content';

  for (const targetModel of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config
      });

      const textOutput = (response.text || '').trim();
      if (!textOutput) {
        lastError = `Empty response from Gemini model ${targetModel}`;
        continue;
      }

      try {
        const cleanJson = textOutput.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        return {
          success: true,
          data: parsed as T,
          rawContent: textOutput
        };
      } catch (jsonErr) {
        return {
          success: true,
          rawContent: textOutput
        };
      }
    } catch (err: any) {
      lastError = err.message || String(err);
      console.warn(`Gemini model "${targetModel}" error:`, lastError);
      continue;
    }
  }

  return {
    success: false,
    error: lastError
  };
}
