import OpenAI from "openai";
import type {
  IngredientGroup,
  Note,
  Nutrition,
  RecipeInput,
} from "./types";

type ParsedRecipe = Omit<RecipeInput, "sourcePdf" | "images">;

const SYSTEM_PROMPT = `You extract structured recipe information from raw recipe text.
Return ONLY a JSON object matching this schema:
{
  "title": string,
  "description": string,                // 1-2 sentence summary, "" if none
  "servings": string,                   // e.g. "2 servings"; "" if not stated
  "prepTime": string,                   // e.g. "10 min"; "" if not stated
  "cookTime": string,                   // e.g. "15 min"; "" if not stated
  "ingredientGroups": [                 // group ingredients by component
    {
      "name": string,                   // e.g. "Chicken", "Marinade"; "" if not grouped
      "items": [
        { "name": string, "quantity": string }
      ]
    }
  ],
  "instructions": string[],             // ordered steps, plain prose, no leading numbers
  "tags": string[],                     // 0-5 short lowercase tags
  "nutrition": {                        // per serving; omit any field not stated
    "calories": string,                 // e.g. "390-420 kcal"
    "protein": string,                  // e.g. "52 g"
    "carbs": string,
    "fat": string,
    "fiber": string,
    "sodium": string,
    "other": [{ "label": string, "value": string }]
  } | null,
  "notes": [                            // any other labeled section in the recipe
    {
      "heading": string,                // e.g. "Why this recipe works", "Mistakes to avoid"
      "body": string,                   // for prose sections (or "")
      "items": string[]                 // for bullet sections (or [])
    }
  ]
}
Rules:
- Do not invent details. Use "", [], or null when unknown.
- If ingredients aren't grouped in the source, still wrap them in one group with name "".
- Use "notes" for any labeled section that doesn't fit the other fields:
  "Why this recipe works", "Flavor profile", "Make it more filling",
  "Make it higher protein", "Storage notes", "Mistakes to avoid",
  "Protein source breakdown", etc.
- Each note should have either a body (prose) OR items (bullets), not both.
- Output JSON only, no markdown, no commentary.`;

export async function extractRecipeFromText(rawText: string): Promise<ParsedRecipe> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set on the server");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const truncated = rawText.length > 20000 ? rawText.slice(0, 20000) : rawText;

  const response = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    temperature: 0.1,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract the recipe from this text:\n\n---\n${truncated}\n---`,
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

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
    : [];
}

function normalizeIngredientGroups(v: unknown): IngredientGroup[] {
  if (!Array.isArray(v) || v.length === 0) return [];

  // Tolerate the model returning the legacy flat string[] shape.
  if (typeof v[0] === "string") {
    return [
      {
        name: "",
        items: (v as unknown[])
          .filter((s) => typeof s === "string" && (s as string).trim())
          .map((s) => ({ name: (s as string).trim(), quantity: "" })),
      },
    ];
  }

  return (v as unknown[])
    .filter((g): g is Record<string, unknown> => !!g && typeof g === "object")
    .map((g) => {
      const items = Array.isArray(g.items)
        ? (g.items as unknown[])
            .filter(
              (i): i is Record<string, unknown> => !!i && typeof i === "object"
            )
            .map((i) => ({
              name: typeof i.name === "string" ? i.name.trim() : "",
              quantity:
                typeof i.quantity === "string" ? i.quantity.trim() : "",
            }))
            .filter((i) => i.name)
        : [];
      return {
        name: typeof g.name === "string" ? g.name.trim() : "",
        items,
      };
    })
    .filter((g) => g.items.length > 0);
}

function normalizeNutrition(v: unknown): Nutrition | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;
  const out: Nutrition = {};
  for (const k of [
    "calories",
    "protein",
    "carbs",
    "fat",
    "fiber",
    "sodium",
  ] as const) {
    const s = asString(obj[k]);
    if (s) out[k] = s;
  }
  if (Array.isArray(obj.other)) {
    const others = (obj.other as unknown[])
      .filter(
        (x): x is Record<string, unknown> => !!x && typeof x === "object"
      )
      .map((x) => ({
        label: asString(x.label),
        value: asString(x.value),
      }))
      .filter((x) => x.label && x.value);
    if (others.length) out.other = others;
  }
  if (
    !out.calories &&
    !out.protein &&
    !out.carbs &&
    !out.fat &&
    !out.fiber &&
    !out.sodium &&
    !out.other?.length
  ) {
    return null;
  }
  return out;
}

function normalizeNotes(v: unknown): Note[] {
  if (!Array.isArray(v)) return [];
  return (v as unknown[])
    .filter((n): n is Record<string, unknown> => !!n && typeof n === "object")
    .map((n) => {
      const heading = asString(n.heading);
      const body = asString(n.body);
      const items = asStringArray(n.items);
      return {
        heading,
        body: body || undefined,
        items: items.length ? items : undefined,
      };
    })
    .filter((n) => n.heading && (n.body || (n.items && n.items.length)));
}

function normalize(raw: unknown): ParsedRecipe {
  const obj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const title = asString(obj.title) || "Untitled recipe";
  return {
    title,
    description: asString(obj.description),
    servings: asString(obj.servings),
    prepTime: asString(obj.prepTime),
    cookTime: asString(obj.cookTime),
    ingredientGroups: normalizeIngredientGroups(obj.ingredientGroups),
    instructions: asStringArray(obj.instructions),
    tags: asStringArray(obj.tags).slice(0, 5).map((t) => t.toLowerCase()),
    nutrition: normalizeNutrition(obj.nutrition),
    notes: normalizeNotes(obj.notes),
  };
}
