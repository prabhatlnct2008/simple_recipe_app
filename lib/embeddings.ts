import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims
const MAX_INPUT_CHARS = 8_000;

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set on the server");
  }

  const input = text.trim().slice(0, MAX_INPUT_CHARS);
  if (!input) {
    throw new Error("Cannot embed empty text");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });

  const vector = response.data[0]?.embedding;
  if (!vector || vector.length === 0) {
    throw new Error("OpenAI returned an empty embedding");
  }
  return vector;
}

import type { IngredientGroup, Note } from "./types";

export function embeddingTextForRecipe(input: {
  title: string;
  description: string;
  tags: string[];
  ingredientGroups: IngredientGroup[];
  notes: Note[];
}): string {
  const ingredientNames = input.ingredientGroups
    .flatMap((g) => g.items.map((i) => i.name))
    .filter(Boolean);
  const noteText = input.notes
    .map((n) =>
      [n.heading, n.body, n.items?.join(", ")].filter(Boolean).join(" — ")
    )
    .join("\n");
  return [
    input.title,
    input.description,
    input.tags.join(", "),
    ingredientNames.join(", "),
    noteText,
  ]
    .filter((s) => s && s.trim())
    .join("\n");
}
