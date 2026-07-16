import { GoogleGenerativeAI } from '@google/generative-ai';

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY is not configured in .env');
  if (!_client) _client = new GoogleGenerativeAI(key);
  return _client;
}

const MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

/**
 * Thin Gemini wrapper used by every agent.
 *
 * Sends a system instruction + user message and returns a parsed JSON object T.
 * Throws on failure so the orchestrator can catch per-agent and fall back.
 */
export async function callGemini<T>(
  systemPrompt: string,
  userMessage: string,
): Promise<T> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL(),
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  });

  const result = await model.generateContent(userMessage);
  const text = result.response.text();

  // Strip markdown fences if the model wraps in them anyway
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return JSON.parse(cleaned) as T;
}
