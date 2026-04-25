import OpenAI from "openai";
import type { RecipeInput } from "./types";

type ParsedRecipe = Omit<RecipeInput, "sourcePdf" | "images">;

const SYSTEM_PROMPT = `You extract structured recipe information from raw recipe PDF text.
Return ONLY a JSON object matching this schema:
{
  "title": string,            // recipe name; required
  "description": string,      // 1-2 sentence summary; "" if none
  "servings": string,         // e.g. "4 servings"; "" if not stated
  "prepTime": string,         // e.g. "15 min"; "" if not stated
  "cookTime": string,         // e.g. "30 min"; "" if not stated
  "ingredients": string[],    // each item one ingredient line, with quantities
  "instructions": string[],   // ordered steps, each one step
  "tags": string[]            // 0-5 short lowercase tags (cuisine, course, dietary, etc.)
}
Rules:
- Do not invent details. Use "" or [] when unknown.
- Keep ingredient lines as written; do not paraphrase quantities.
- Steps should be plain prose, no leading numbers.
- Output JSON only, no markdown, no commentary.`;

export async function extractRecipeFromText(rawText: string): Promise<ParsedRecipe> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set on the server");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const truncated = rawText.length > 20000 ? rawText.slice(0, 20000) : rawText;

  const response = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    temperature: 0.1,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract the recipe from this PDF text:\n\n---\n${truncated}\n---`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new Error("OpenAI response was not valid JSON");
  }

  return normalize(json);
}

function normalize(raw: unknown): ParsedRecipe {
  const obj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
      : [];

  const title = asString(obj.title) || "Untitled recipe";
  return {
    title,
    description: asString(obj.description),
    servings: asString(obj.servings),
    prepTime: asString(obj.prepTime),
    cookTime: asString(obj.cookTime),
    ingredients: asStringArray(obj.ingredients),
    instructions: asStringArray(obj.instructions),
    tags: asStringArray(obj.tags).slice(0, 5).map((t) => t.toLowerCase()),
  };
}
