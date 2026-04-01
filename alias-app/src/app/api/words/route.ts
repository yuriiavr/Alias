import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function generateWithModel(modelName: string, prompt: string) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleanedText = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleanedText);
}

export async function POST(req: Request) {
  try {
    const { difficulty, theme, excludedWords } = await req.json();
    const excludedString = Array.isArray(excludedWords) && excludedWords.length > 0
      ? excludedWords.join(", ")
      : "немає";

    let prompt: string;

    if (difficulty === "theme" && theme?.trim()) {
      prompt = `
        Згенеруй 20 іменників українською мовою для гри Alias на тему: "${theme.trim()}".
        Слова мають бути безпосередньо пов'язані з цією тематикою.
        НЕ використовуй ці слова: ${excludedString}.
        Поверни ТІЛЬКИ чистий JSON масив рядків, без зайвого тексту.
        Приклад: ["яблуко", "автомобіль"]
      `;
    } else {
      prompt = `
        Згенеруй 20 іменників українською мовою для гри Alias.
        Рівень складності: ${difficulty || "medium"} (easy, medium, hard, mix(і складні, і легкі слова)).
        НЕ використовуй ці слова: ${excludedString}.
        Поверни ТІЛЬКИ чистий JSON масив рядків, без зайвого тексту.
        Приклад: ["яблуко", "автомобіль"]
      `;
    }

    try {
      const words = await generateWithModel("gemini-2.5-flash-lite", prompt);
      return NextResponse.json({ words, model: "2.5-flash-lite" });
    } catch (firstError) {
      console.error("Gemini 2.5 failed, trying fallback...", firstError);
      const words = await generateWithModel("gemini-3.1-flash-lite-preview", prompt);
      return NextResponse.json({ words, model: "3.1-flash-lite" });
    }

  } catch (error) {
    console.error("All models failed:", error);
    return NextResponse.json({ error: "Failed to generate words", words: [] }, { status: 500 });
  }
}