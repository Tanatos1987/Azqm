import { getLang, tr } from '@/i18n';
import type { VisionAnalysisResult, VisionProvider } from '@/types';

interface AnalyzeParams {
  provider: VisionProvider;
  apiKey: string;
  model: string;
  base64Image: string; // raw base64, no "data:image/...;base64," prefix
}

const SYSTEM_PROMPT_BG = `Ти си опитен нутриционист. Анализирай снимката на храна
и върни ЕДИНСТВЕНО валиден JSON обект, без markdown форматиране и без обяснения, с точно следните полета:
{
  "foodName": string,       // кратко име на разпознатата храна на български
  "estimatedGrams": number, // прогнозен общ грамаж на порцията, базиран на видимия обем
  "calories": number,       // общо килокалории за цялата порция
  "protein": number,        // грамове протеин за цялата порция
  "fat": number,            // грамове мазнини за цялата порция
  "carbs": number,          // общо въглехидрати в грамове за цялата порция
  "fiber": number           // хранителни фибри в грамове за цялата порция
}
Давай реалистични, консервативни оценки на база типични плътности на калории и видимия обем.
Ако не разпознаваш храна на снимката, върни foodName "Неразпозната храна" и нулеви стойности за всичко останало.`;

const SYSTEM_PROMPT_EN = `You are an experienced nutritionist. Analyze the photo of food
and return ONLY a valid JSON object, with no markdown formatting and no explanations, with exactly these fields:
{
  "foodName": string,       // short name of the recognized food, in English
  "estimatedGrams": number, // estimated total weight of the portion in grams, based on the visible volume
  "calories": number,       // total kilocalories for the whole portion
  "protein": number,        // grams of protein for the whole portion
  "fat": number,            // grams of fat for the whole portion
  "carbs": number,          // total carbohydrates in grams for the whole portion
  "fiber": number           // dietary fiber in grams for the whole portion
}
Give realistic, conservative estimates based on typical calorie densities and the visible volume.
If you don't recognize any food in the photo, return foodName "Unrecognized food" and zero for everything else.`;

/** The prompt follows the app language so the food name comes back in it. */
const systemPrompt = () => (getLang() === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_BG);
const userPrompt = () => tr('Анализирай тази снимка на храна.', 'Analyze this photo of food.');

export async function analyzeFoodPhoto({ provider, apiKey, model, base64Image }: AnalyzeParams): Promise<VisionAnalysisResult> {
  if (!apiKey) {
    throw new Error(tr('Липсва API ключ за Vision AI. Добави го в Настройки.', 'No API key for Vision AI. Add one in Settings.'));
  }
  const raw =
    provider === 'openai'
      ? await callOpenAi(apiKey, model, base64Image)
      : await callGemini(apiKey, model, base64Image);
  return parseVisionResult(raw);
}

async function callOpenAi(apiKey: string, model: string, base64Image: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt() },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt() },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${tr('OpenAI грешка', 'OpenAI error')} (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error(tr('Празен отговор от OpenAI.', 'Empty response from OpenAI.'));
  return content;
}

async function callGemini(apiKey: string, model: string, base64Image: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemPrompt()}\n\n${userPrompt()}` },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${tr('Gemini грешка', 'Gemini error')} (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error(tr('Празен отговор от Gemini.', 'Empty response from Gemini.'));
  return content;
}

function parseVisionResult(raw: string): VisionAnalysisResult {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(tr('Моделът не върна валиден JSON.', "The model didn't return valid JSON."));
    data = JSON.parse(match[0]);
  }
  const num = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
  return {
    foodName: typeof data.foodName === 'string' && data.foodName.trim() ? data.foodName : tr('Неразпозната храна', 'Unrecognized food'),
    estimatedGrams: num(data.estimatedGrams),
    calories: num(data.calories),
    protein: num(data.protein),
    fat: num(data.fat),
    carbs: num(data.carbs),
    fiber: num(data.fiber),
  };
}
