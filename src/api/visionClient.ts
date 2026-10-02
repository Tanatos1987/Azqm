import type { VisionAnalysisResult, VisionProvider } from '@/types';
import { netCarbsOf } from '@/utils/nutrition';

interface AnalyzeParams {
  provider: VisionProvider;
  apiKey: string;
  model: string;
  base64Image: string; // raw base64, no "data:image/...;base64," prefix
}

const SYSTEM_PROMPT = `Ти си опитен нутриционист, специализиран в кето хранене. Анализирай снимката на храна
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

export async function analyzeFoodPhoto({ provider, apiKey, model, base64Image }: AnalyzeParams): Promise<VisionAnalysisResult> {
  if (!apiKey) {
    throw new Error('Липсва API ключ за Vision AI. Добави го в Настройки.');
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
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Анализирай тази снимка на храна.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI грешка (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Празен отговор от OpenAI.');
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
              { text: `${SYSTEM_PROMPT}\n\nАнализирай тази снимка на храна.` },
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
    throw new Error(`Gemini грешка (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Празен отговор от Gemini.');
  return content;
}

function parseVisionResult(raw: string): VisionAnalysisResult {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Моделът не върна валиден JSON.');
    data = JSON.parse(match[0]);
  }
  const num = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
  const carbs = num(data.carbs);
  const fiber = num(data.fiber);
  return {
    foodName: typeof data.foodName === 'string' && data.foodName.trim() ? data.foodName : 'Неразпозната храна',
    estimatedGrams: num(data.estimatedGrams),
    calories: num(data.calories),
    protein: num(data.protein),
    fat: num(data.fat),
    carbs,
    fiber,
    netCarbs: netCarbsOf(carbs, fiber),
  };
}
