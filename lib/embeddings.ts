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

export function embeddingTextForRecipe(input: {
  title: string;
  description: string;
  tags: string[];
  ingredients: string[];
}): string {
  return [
    input.title,
    input.description,
    input.tags.join(", "),
    input.ingredients.join(", "),
  ]
    .filter(Boolean)
    .join("\n");
}
